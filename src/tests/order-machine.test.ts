import { describe, expect, it } from "vitest";
import { transition, TransitionError, type Actor, type MachineOrder, type OrderEventType } from "@/lib/order-machine";
import { config, DAY, HOUR } from "@/lib/config";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const NOW = new Date("2026-11-11T07:00:00Z");
const BUYER: Actor = { kind: "user", id: "buyer" };
const SELLER: Actor = { kind: "user", id: "seller" };
const STRANGER: Actor = { kind: "user", id: "stranger" };
const SYSTEM: Actor = { kind: "system" };
const ADMIN: Actor = { kind: "admin", id: "admin" };

function order(status: OrderStatus, patch: Partial<MachineOrder> = {}): MachineOrder {
  return {
    id: "o1",
    status,
    createdById: "seller",
    buyerId: "buyer",
    sellerId: "seller",
    priceSatang: 129000,
    feeSatang: 2500,
    paymentDeadline: new Date(NOW.getTime() + HOUR),
    shipDeadline: new Date(NOW.getTime() + HOUR),
    inspectDeadline: new Date(NOW.getTime() + HOUR),
    shippedAt: new Date(NOW.getTime() - DAY),
    ...patch,
  };
}

const past = new Date(NOW.getTime() - 1000);
const SHIP: OrderEventType = { type: "SHIP", carrier: "Kerry", trackingNo: "th0123456789", hasPackingPhoto: true };

function expectError(fn: () => unknown, code: TransitionError["code"]) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(TransitionError);
    expect((e as TransitionError).code).toBe(code);
    return;
  }
  throw new Error("expected TransitionError");
}

describe("happy path transitions", () => {
  it("CREATED → PAID_HELD (system/webhook) + HOLD ledger + ship deadline", () => {
    const r = transition(order("CREATED"), { type: "PAYMENT_SUCCEEDED" }, SYSTEM, NOW);
    expect(r.to).toBe("PAID_HELD");
    expect(r.ledger).toEqual([{ type: "HOLD", amountSatang: 131500, idempotencyKey: "o1:HOLD" }]);
    expect(r.patch.shipDeadline!.getTime() - NOW.getTime()).toBe(config.SHIP_DEADLINE_HOURS * HOUR);
  });

  it("CREATED → CANCELLED (creator)", () => {
    expect(transition(order("CREATED"), { type: "CANCEL" }, SELLER, NOW).to).toBe("CANCELLED");
  });

  it("CREATED → CANCELLED (payment expired)", () => {
    expect(transition(order("CREATED", { paymentDeadline: past }), { type: "PAYMENT_EXPIRED" }, SYSTEM, NOW).to).toBe("CANCELLED");
  });

  it("PAID_HELD → SHIPPED (seller) normalizes tracking no", () => {
    const r = transition(order("PAID_HELD"), SHIP, SELLER, NOW);
    expect(r.to).toBe("SHIPPED");
    expect(r.patch.trackingNo).toBe("TH0123456789");
  });

  it("PAID_HELD → REFUNDED (ship expired) full refund incl. fee", () => {
    const r = transition(order("PAID_HELD", { shipDeadline: past }), { type: "SHIP_EXPIRED" }, SYSTEM, NOW);
    expect(r.to).toBe("REFUNDED");
    expect(r.ledger).toEqual([{ type: "REFUND_TO_BUYER", amountSatang: 131500, idempotencyKey: "o1:REFUND" }]);
  });

  it("SHIPPED → DELIVERED (buyer or system) + inspect deadline 48h", () => {
    const r = transition(order("SHIPPED"), { type: "MARK_DELIVERED" }, BUYER, NOW);
    expect(r.to).toBe("DELIVERED");
    expect(r.patch.inspectDeadline!.getTime() - NOW.getTime()).toBe(config.INSPECT_WINDOW_HOURS * HOUR);
    expect(transition(order("SHIPPED"), { type: "MARK_DELIVERED" }, SYSTEM, NOW).to).toBe("DELIVERED");
  });

  it("SHIPPED → DISPUTED เมื่อเกิน DELIVERY_MAX_DAYS", () => {
    const shippedAt = new Date(NOW.getTime() - (config.DELIVERY_MAX_DAYS * DAY + 1));
    expect(transition(order("SHIPPED", { shippedAt }), { type: "REPORT_NOT_RECEIVED" }, BUYER, NOW).to).toBe("DISPUTED");
  });

  it("DELIVERED → RELEASED (buyer confirm) ledger seller + fee", () => {
    const r = transition(order("DELIVERED"), { type: "CONFIRM" }, BUYER, NOW);
    expect(r.to).toBe("RELEASED");
    expect(r.ledger).toEqual([
      { type: "RELEASE_TO_SELLER", amountSatang: 129000, idempotencyKey: "o1:RELEASE" },
      { type: "FEE", amountSatang: 2500, idempotencyKey: "o1:FEE" },
    ]);
  });

  it("DELIVERED → RELEASED (inspect expired)", () => {
    expect(transition(order("DELIVERED", { inspectDeadline: past }), { type: "INSPECT_EXPIRED" }, SYSTEM, NOW).to).toBe("RELEASED");
  });

  it("DELIVERED → DISPUTED (buyer with evidence)", () => {
    expect(transition(order("DELIVERED"), { type: "DISPUTE", hasEvidence: true }, BUYER, NOW).to).toBe("DISPUTED");
  });

  it("DISPUTED → REFUNDED / RELEASED (admin)", () => {
    expect(transition(order("DISPUTED"), { type: "RESOLVE", resolution: "REFUND" }, ADMIN, NOW).to).toBe("REFUNDED");
    expect(transition(order("DISPUTED"), { type: "RESOLVE", resolution: "RELEASE" }, ADMIN, NOW).to).toBe("RELEASED");
  });
});

describe("forbidden actors", () => {
  const cases: [string, OrderStatus, OrderEventType, Actor][] = [
    ["buyer cannot fake payment", "CREATED", { type: "PAYMENT_SUCCEEDED" }, BUYER],
    ["non-creator cannot cancel", "CREATED", { type: "CANCEL" }, BUYER],
    ["user cannot expire payment", "CREATED", { type: "PAYMENT_EXPIRED" }, SELLER],
    ["buyer cannot ship", "PAID_HELD", SHIP, BUYER],
    ["stranger cannot ship", "PAID_HELD", SHIP, STRANGER],
    ["seller cannot trigger refund", "PAID_HELD", { type: "SHIP_EXPIRED" }, SELLER],
    ["seller cannot mark delivered", "SHIPPED", { type: "MARK_DELIVERED" }, SELLER],
    ["seller cannot report not received", "SHIPPED", { type: "REPORT_NOT_RECEIVED" }, SELLER],
    ["seller cannot confirm", "DELIVERED", { type: "CONFIRM" }, SELLER],
    ["stranger cannot confirm", "DELIVERED", { type: "CONFIRM" }, STRANGER],
    ["admin cannot confirm for buyer", "DELIVERED", { type: "CONFIRM" }, ADMIN],
    ["buyer cannot force auto-release", "DELIVERED", { type: "INSPECT_EXPIRED" }, BUYER],
    ["seller cannot dispute", "DELIVERED", { type: "DISPUTE", hasEvidence: true }, SELLER],
    ["buyer cannot resolve", "DISPUTED", { type: "RESOLVE", resolution: "REFUND" }, BUYER],
    ["seller cannot resolve", "DISPUTED", { type: "RESOLVE", resolution: "RELEASE" }, SELLER],
    ["system cannot resolve", "DISPUTED", { type: "RESOLVE", resolution: "RELEASE" }, SYSTEM],
  ];
  it.each(cases)("%s", (_n, status, ev, actor) => expectError(() => transition(order(status), ev, actor, NOW), "FORBIDDEN"));
});

describe("preconditions", () => {
  it("ห้ามจ่ายถ้าคู่สัญญาไม่ครบ", () =>
    expectError(() => transition(order("CREATED", { sellerId: null }), { type: "PAYMENT_SUCCEEDED" }, SYSTEM, NOW), "PRECONDITION"));
  it("ยังไม่หมดเวลาจ่าย", () => expectError(() => transition(order("CREATED"), { type: "PAYMENT_EXPIRED" }, SYSTEM, NOW), "PRECONDITION"));
  it("ส่งของต้องมีรูปตอนแพ็ก", () =>
    expectError(() => transition(order("PAID_HELD"), { ...SHIP, hasPackingPhoto: false } as OrderEventType, SELLER, NOW), "PRECONDITION"));
  it("เลขพัสดุสั้นเกินไป", () =>
    expectError(() => transition(order("PAID_HELD"), { ...SHIP, trackingNo: "12" } as OrderEventType, SELLER, NOW), "PRECONDITION"));
  it("ส่งของหลังเลยกำหนดไม่ได้", () =>
    expectError(() => transition(order("PAID_HELD", { shipDeadline: past }), SHIP, SELLER, NOW), "PRECONDITION"));
  it("ยังไม่เลยกำหนดส่ง → ห้าม auto refund", () =>
    expectError(() => transition(order("PAID_HELD"), { type: "SHIP_EXPIRED" }, SYSTEM, NOW), "PRECONDITION"));
  it("แจ้งของไม่มาก่อน 14 วันไม่ได้", () =>
    expectError(() => transition(order("SHIPPED"), { type: "REPORT_NOT_RECEIVED" }, BUYER, NOW), "PRECONDITION"));
  it("ยังไม่หมดเวลาตรวจ → ห้าม auto release", () =>
    expectError(() => transition(order("DELIVERED"), { type: "INSPECT_EXPIRED" }, SYSTEM, NOW), "PRECONDITION"));
  it("ข้อพิพาทต้องมีหลักฐาน", () =>
    expectError(() => transition(order("DELIVERED"), { type: "DISPUTE", hasEvidence: false }, BUYER, NOW), "PRECONDITION"));
  it("เปิดข้อพิพาทหลังหมดเวลาตรวจไม่ได้", () =>
    expectError(() => transition(order("DELIVERED", { inspectDeadline: past }), { type: "DISPUTE", hasEvidence: true }, BUYER, NOW), "PRECONDITION"));
});

describe("invalid states (ห้ามข้ามขั้น / ห้ามทำซ้ำ)", () => {
  const events: [OrderEventType, Actor, OrderStatus[]][] = [
    [{ type: "PAYMENT_SUCCEEDED" }, SYSTEM, ["CREATED"]],
    [{ type: "CANCEL" }, SELLER, ["CREATED"]],
    [SHIP, SELLER, ["PAID_HELD"]],
    [{ type: "MARK_DELIVERED" }, BUYER, ["SHIPPED"]],
    [{ type: "CONFIRM" }, BUYER, ["DELIVERED"]],
    [{ type: "DISPUTE", hasEvidence: true }, BUYER, ["DELIVERED"]],
    [{ type: "RESOLVE", resolution: "REFUND" }, ADMIN, ["DISPUTED"]],
  ];
  for (const [ev, actor, allowed] of events) {
    for (const s of ORDER_STATUSES.filter((x) => !allowed.includes(x))) {
      it(`${ev.type} ไม่ได้ในสถานะ ${s}`, () => expectError(() => transition(order(s), ev, actor, NOW), "INVALID_STATE"));
    }
  }

  it("ยืนยันซ้ำหลัง RELEASED ไม่โอนซ้ำ", () => {
    const r = transition(order("DELIVERED"), { type: "CONFIRM" }, BUYER, NOW);
    expectError(() => transition(order(r.to), { type: "CONFIRM" }, BUYER, NOW), "INVALID_STATE");
    expectError(() => transition(order(r.to, { inspectDeadline: past }), { type: "INSPECT_EXPIRED" }, SYSTEM, NOW), "INVALID_STATE");
  });

  it("final states ไม่มีทางออก", () => {
    for (const s of ["RELEASED", "REFUNDED", "CANCELLED"] as OrderStatus[]) {
      const allEvents: [OrderEventType, Actor][] = [
        [{ type: "PAYMENT_SUCCEEDED" }, SYSTEM],
        [{ type: "CANCEL" }, SELLER],
        [SHIP, SELLER],
        [{ type: "SHIP_EXPIRED" }, SYSTEM],
        [{ type: "MARK_DELIVERED" }, BUYER],
        [{ type: "CONFIRM" }, BUYER],
        [{ type: "INSPECT_EXPIRED" }, SYSTEM],
        [{ type: "RESOLVE", resolution: "RELEASE" }, ADMIN],
      ];
      for (const [ev, actor] of allEvents) expect(() => transition(order(s, { shipDeadline: past, inspectDeadline: past }), ev, actor, NOW)).toThrow(TransitionError);
    }
  });
});
