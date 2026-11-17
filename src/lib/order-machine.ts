/**
 * Order state machine (SPEC ข้อ 3)
 * ฟังก์ชันเดียวที่ตัดสินการเปลี่ยนสถานะ — pure ไม่แตะ DB
 * ที่อื่นห้ามแก้ status ตรง ๆ ให้เรียกผ่าน applyTransition() ใน orders.ts ซึ่งใช้ฟังก์ชันนี้
 */
import { config, DAY, HOUR } from "./config";
import type { LedgerType, OrderStatus } from "./types";

export type Actor =
  | { kind: "user"; id: string }
  | { kind: "admin"; id: string }
  | { kind: "system" };

export type OrderEventType =
  | { type: "PAYMENT_SUCCEEDED" }
  | { type: "CANCEL" }
  | { type: "PAYMENT_EXPIRED" }
  | { type: "SHIP"; carrier: string; trackingNo: string; hasPackingPhoto: boolean }
  /** รหัสเกม: ผู้ขายส่งข้อมูลล็อกอินในห้องดีล → ถึงมือผู้ซื้อทันที (ข้าม SHIPPED) */
  | { type: "DELIVER_CREDENTIALS"; hasCredentials: boolean }
  | { type: "SHIP_EXPIRED" }
  | { type: "MARK_DELIVERED" }
  | { type: "REPORT_NOT_RECEIVED" }
  | { type: "CONFIRM" }
  | { type: "INSPECT_EXPIRED" }
  | { type: "DISPUTE"; hasEvidence: boolean }
  | { type: "RESOLVE"; resolution: "REFUND" | "RELEASE" };

export interface MachineOrder {
  id: string;
  status: OrderStatus;
  createdById: string;
  buyerId: string | null;
  sellerId: string | null;
  priceSatang: number;
  feeSatang: number;
  paymentDeadline: Date | null;
  shipDeadline: Date | null;
  inspectDeadline: Date | null;
  shippedAt: Date | null;
  /** PHYSICAL (ค่าเริ่มต้น) | GAME_ACCOUNT */
  kind?: string;
}

const isDigital = (o: MachineOrder) => o.kind === "GAME_ACCOUNT";

export interface LedgerIntent {
  type: LedgerType;
  amountSatang: number;
  idempotencyKey: string;
}

export interface TransitionResult {
  from: OrderStatus;
  to: OrderStatus;
  patch: Partial<{
    paidAt: Date;
    shipDeadline: Date;
    shippedAt: Date;
    carrier: string;
    trackingNo: string;
    deliveredAt: Date;
    inspectDeadline: Date;
    releasedAt: Date;
    refundedAt: Date;
  }>;
  ledger: LedgerIntent[];
  note: string;
}

export class TransitionError extends Error {
  constructor(
    message: string,
    public code: "INVALID_STATE" | "FORBIDDEN" | "PRECONDITION" = "INVALID_STATE",
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

const isUser = (a: Actor, id: string | null) => a.kind === "user" && id !== null && a.id === id;
const isBuyer = (a: Actor, o: MachineOrder) => isUser(a, o.buyerId);
const isSeller = (a: Actor, o: MachineOrder) => isUser(a, o.sellerId);
const isSystem = (a: Actor) => a.kind === "system";
const isAdmin = (a: Actor) => a.kind === "admin";

function ensure(cond: boolean, msg: string, code: TransitionError["code"] = "FORBIDDEN"): asserts cond {
  if (!cond) throw new TransitionError(msg, code);
}

function expectStatus(o: MachineOrder, ...allowed: OrderStatus[]) {
  if (!allowed.includes(o.status)) {
    throw new TransitionError(`ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน (${o.status})`, "INVALID_STATE");
  }
}

const releaseLedger = (o: MachineOrder): LedgerIntent[] => [
  { type: "RELEASE_TO_SELLER", amountSatang: o.priceSatang, idempotencyKey: `${o.id}:RELEASE` },
  { type: "FEE", amountSatang: o.feeSatang, idempotencyKey: `${o.id}:FEE` },
];
const refundLedger = (o: MachineOrder): LedgerIntent[] => [
  { type: "REFUND_TO_BUYER", amountSatang: o.priceSatang + o.feeSatang, idempotencyKey: `${o.id}:REFUND` },
];

export function transition(
  order: MachineOrder,
  event: OrderEventType,
  actor: Actor,
  now: Date = new Date(),
): TransitionResult {
  const o = order;
  const t = now.getTime();
  const from = o.status;

  switch (event.type) {
    case "PAYMENT_SUCCEEDED": {
      expectStatus(o, "CREATED");
      ensure(isSystem(actor), "ต้องยืนยันการชำระผ่าน payment gateway เท่านั้น");
      ensure(!!o.buyerId && !!o.sellerId, "รายการยังมีคู่สัญญาไม่ครบ", "PRECONDITION");
      return {
        from,
        to: "PAID_HELD",
        patch: { paidAt: now, shipDeadline: new Date(t + (isDigital(o) ? config.DIGITAL_DELIVER_HOURS : config.SHIP_DEADLINE_HOURS) * HOUR) },
        ledger: [{ type: "HOLD", amountSatang: o.priceSatang + o.feeSatang, idempotencyKey: `${o.id}:HOLD` }],
        note: "ไว้ใจพักเงินไว้",
      };
    }
    case "CANCEL": {
      expectStatus(o, "CREATED");
      ensure(isUser(actor, o.createdById), "เฉพาะคนสร้างรายการเท่านั้นที่ยกเลิกได้");
      return { from, to: "CANCELLED", patch: {}, ledger: [], note: "ยกเลิกโดยผู้สร้างรายการ" };
    }
    case "PAYMENT_EXPIRED": {
      expectStatus(o, "CREATED");
      ensure(isSystem(actor), "เฉพาะระบบเท่านั้น");
      ensure(!!o.paymentDeadline && t >= o.paymentDeadline.getTime(), "ยังไม่หมดเวลาชำระเงิน", "PRECONDITION");
      return { from, to: "CANCELLED", patch: {}, ledger: [], note: "หมดเวลาชำระเงิน ยกเลิกอัตโนมัติ" };
    }
    case "DELIVER_CREDENTIALS": {
      expectStatus(o, "PAID_HELD");
      ensure(isSeller(actor, o), "เฉพาะผู้ขายเท่านั้น");
      ensure(isDigital(o), "รายการนี้เป็นสินค้าที่ต้องส่งพัสดุ", "PRECONDITION");
      ensure(event.hasCredentials, "กรุณาใส่ข้อมูลล็อกอิน", "PRECONDITION");
      ensure(!o.shipDeadline || t < o.shipDeadline.getTime(), "เลยกำหนดส่งรหัสแล้ว", "PRECONDITION");
      return {
        from,
        to: "DELIVERED",
        patch: { shippedAt: now, deliveredAt: now, carrier: "ส่งรหัสในห้องดีล", inspectDeadline: new Date(t + config.DIGITAL_INSPECT_HOURS * HOUR) },
        ledger: [],
        note: "ผู้ขายส่งรหัสเกมแล้ว",
      };
    }
    case "SHIP": {
      expectStatus(o, "PAID_HELD");
      ensure(isSeller(actor, o), "เฉพาะผู้ขายเท่านั้น");
      ensure(!isDigital(o), "รหัสเกมไม่ต้องส่งพัสดุ — ใช้ปุ่มส่งรหัสเกมแทน", "PRECONDITION");
      ensure(event.trackingNo.trim().length >= 5, "เลขพัสดุไม่ถูกต้อง", "PRECONDITION");
      ensure(event.hasPackingPhoto, "ต้องแนบรูปตอนแพ็กของอย่างน้อย 1 รูป", "PRECONDITION");
      ensure(!o.shipDeadline || t < o.shipDeadline.getTime(), "เลยกำหนดส่งของแล้ว", "PRECONDITION");
      return {
        from,
        to: "SHIPPED",
        patch: { shippedAt: now, carrier: event.carrier, trackingNo: event.trackingNo.trim().toUpperCase() },
        ledger: [],
        note: "แนบเลขพัสดุแล้ว",
      };
    }
    case "SHIP_EXPIRED": {
      expectStatus(o, "PAID_HELD");
      ensure(isSystem(actor), "เฉพาะระบบเท่านั้น");
      ensure(!!o.shipDeadline && t >= o.shipDeadline.getTime(), "ยังไม่เลยกำหนดส่ง", "PRECONDITION");
      return {
        from,
        to: "REFUNDED",
        patch: { refundedAt: now },
        ledger: refundLedger(o),
        note: "ผู้ขายไม่ส่งของตามกำหนด คืนเงินอัตโนมัติ",
      };
    }
    case "MARK_DELIVERED": {
      expectStatus(o, "SHIPPED");
      ensure(isBuyer(actor, o) || isSystem(actor), "เฉพาะผู้ซื้อหรือระบบขนส่งเท่านั้น");
      return {
        from,
        to: "DELIVERED",
        patch: { deliveredAt: now, inspectDeadline: new Date(t + config.INSPECT_WINDOW_HOURS * HOUR) },
        ledger: [],
        note: isSystem(actor) ? "ขนส่งแจ้งว่าของถึงแล้ว" : "ผู้ซื้อยืนยันว่าได้รับของ",
      };
    }
    case "REPORT_NOT_RECEIVED": {
      expectStatus(o, "SHIPPED");
      ensure(isBuyer(actor, o), "เฉพาะผู้ซื้อเท่านั้น");
      const since = o.shippedAt ? t - o.shippedAt.getTime() : 0;
      ensure(
        since >= config.DELIVERY_MAX_DAYS * DAY,
        `แจ้งได้เมื่อส่งของเกิน ${config.DELIVERY_MAX_DAYS} วัน`,
        "PRECONDITION",
      );
      return { from, to: "DISPUTED", patch: {}, ledger: [], note: "ผู้ซื้อแจ้งว่ายังไม่ได้รับของ" };
    }
    case "CONFIRM": {
      expectStatus(o, "DELIVERED");
      ensure(isBuyer(actor, o), "เฉพาะผู้ซื้อเท่านั้น");
      return {
        from,
        to: "RELEASED",
        patch: { releasedAt: now },
        ledger: releaseLedger(o),
        note: "ผู้ซื้อยืนยันว่าของตรงปก",
      };
    }
    case "INSPECT_EXPIRED": {
      expectStatus(o, "DELIVERED");
      ensure(isSystem(actor), "เฉพาะระบบเท่านั้น");
      ensure(!!o.inspectDeadline && t >= o.inspectDeadline.getTime(), "ยังไม่หมดเวลาตรวจของ", "PRECONDITION");
      return {
        from,
        to: "RELEASED",
        patch: { releasedAt: now },
        ledger: releaseLedger(o),
        note: "หมดเวลาตรวจของ ปล่อยเงินอัตโนมัติ",
      };
    }
    case "DISPUTE": {
      expectStatus(o, "DELIVERED");
      ensure(isBuyer(actor, o), "เฉพาะผู้ซื้อเท่านั้น");
      ensure(event.hasEvidence, "ต้องแนบรูปหรือวิดีโอเป็นหลักฐาน", "PRECONDITION");
      ensure(!o.inspectDeadline || t < o.inspectDeadline.getTime(), "หมดเวลาตรวจของแล้ว", "PRECONDITION");
      return { from, to: "DISPUTED", patch: {}, ledger: [], note: "ผู้ซื้อแจ้งว่าไม่ตรงปก" };
    }
    case "RESOLVE": {
      expectStatus(o, "DISPUTED");
      ensure(isAdmin(actor), "เฉพาะแอดมินเท่านั้น");
      return event.resolution === "REFUND"
        ? { from, to: "REFUNDED", patch: { refundedAt: now }, ledger: refundLedger(o), note: "แอดมินตัดสิน: คืนเงินผู้ซื้อ" }
        : { from, to: "RELEASED", patch: { releasedAt: now }, ledger: releaseLedger(o), note: "แอดมินตัดสิน: ปล่อยเงินให้ผู้ขาย" };
    }
  }
}
