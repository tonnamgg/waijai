import { randomBytes, randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { writeLedger } from "./ledger";
import { transition, type Actor, type OrderEventType, type TransitionResult } from "./order-machine";
import { HttpError } from "./http";
import type { OrderStatus, Role } from "./types";

export const orderInclude = {
  buyer: true,
  seller: true,
  media: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  dispute: true,
  rating: true,
} satisfies Prisma.OrderInclude;

export type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function actorId(a: Actor) {
  return a.kind === "system" ? "SYSTEM" : a.id;
}

/**
 * จุดเดียวที่เขียน Order.status ลง DB
 * - ตัดสินด้วย transition() (ตรวจสิทธิ์ + เงื่อนไข)
 * - optimistic lock: update เฉพาะเมื่อสถานะยังเป็น from (กันกดซ้ำ/แข่งกับ cron)
 * - บันทึก OrderEvent + LedgerEntry ใน transaction เดียวกัน
 */
export async function applyTransition(
  orderId: string,
  event: OrderEventType,
  actor: Actor,
  opts: { now?: Date; extra?: (tx: Prisma.TransactionClient, r: TransitionResult) => Promise<void> } = {},
) {
  const now = opts.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new HttpError(404, "ไม่พบรายการ");
    const result = transition({ ...order, status: order.status as OrderStatus }, event, actor, now);
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: result.from },
      data: { status: result.to, ...result.patch },
    });
    if (updated.count !== 1) throw new HttpError(409, "สถานะรายการเปลี่ยนไปแล้ว กรุณาลองใหม่");
    await tx.orderEvent.create({
      data: { orderId, from: result.from, to: result.to, actor: actorId(actor), note: result.note, createdAt: now },
    });
    await writeLedger(tx, orderId, result.ledger);
    if (opts.extra) await opts.extra(tx, result);
    return result;
  });
}

export function viewRole(order: { buyerId: string | null; sellerId: string | null }, userId: string): Role | null {
  if (order.buyerId === userId) return "BUYER";
  if (order.sellerId === userId) return "SELLER";
  return null;
}

/** โหลดรายการ + ตรวจว่าผู้เรียกเป็นคู่สัญญา (หรือแอดมิน) */
export async function getOrderForUser(id: string, user: { id: string; role: string }) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new HttpError(404, "ไม่พบรายการ");
  const isParty = order.buyerId === user.id || order.sellerId === user.id || order.createdById === user.id;
  if (!isParty && user.role !== "admin") throw new HttpError(403, "คุณไม่ใช่คู่สัญญาของรายการนี้");
  return order;
}

export async function generateCodes() {
  for (let i = 0; i < 10; i++) {
    const code = `WJ-${randomInt(10000, 99999)}`;
    const shareCode = randomBytes(6).toString("base64url");
    const clash = await prisma.order.findFirst({ where: { OR: [{ code }, { shareCode }] } });
    if (!clash) return { code, shareCode };
  }
  throw new Error("cannot generate unique order code");
}

// ---------- DTO (ส่งให้ client component) ----------

const userLite = (u: { id: string; username: string; displayName: string; kycVerified: boolean } | null) =>
  u ? { id: u.id, username: u.username, displayName: u.displayName, kycVerified: u.kycVerified } : null;

export function toDTO(o: OrderFull) {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    id: o.id,
    code: o.code,
    shareCode: o.shareCode,
    title: o.title,
    specText: o.specText,
    checklistItems: JSON.parse(o.checklistItems || "[]") as string[],
    priceSatang: o.priceSatang,
    feeSatang: o.feeSatang,
    status: o.status as OrderStatus,
    creatorRole: o.creatorRole as Role,
    createdById: o.createdById,
    counterpartyHandle: o.counterpartyHandle,
    buyer: userLite(o.buyer),
    seller: userLite(o.seller),
    paymentDeadline: iso(o.paymentDeadline),
    shipDeadline: iso(o.shipDeadline),
    inspectDeadline: iso(o.inspectDeadline),
    paidAt: iso(o.paidAt),
    shippedAt: iso(o.shippedAt),
    deliveredAt: iso(o.deliveredAt),
    releasedAt: iso(o.releasedAt),
    refundedAt: iso(o.refundedAt),
    carrier: o.carrier,
    trackingNo: o.trackingNo,
    createdAt: o.createdAt.toISOString(),
    media: o.media.map((m) => ({ id: m.id, kind: m.kind, url: m.url, mime: m.mime, uploadedBy: m.uploadedBy })),
    events: o.events.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      actor: e.actor,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    dispute: o.dispute
      ? {
          reason: o.dispute.reason,
          detail: o.dispute.detail,
          mismatchItems: JSON.parse(o.dispute.mismatchItems || "[]") as string[],
          sellerResponse: o.dispute.sellerResponse,
          resolution: o.dispute.resolution,
          createdAt: o.dispute.createdAt.toISOString(),
          resolvedAt: iso(o.dispute.resolvedAt),
        }
      : null,
    rating: o.rating ? { stars: o.rating.stars, comment: o.rating.comment } : null,
  };
}

export type OrderDTO = ReturnType<typeof toDTO>;

/** ชื่ออีกฝ่ายจากมุมมองของผู้ใช้ */
export function counterpartyName(o: OrderDTO, role: Role | null): string {
  const other = role === "SELLER" ? o.buyer : o.seller;
  if (other) return `@${other.username}`;
  if (o.counterpartyHandle) return o.counterpartyHandle.startsWith("@") || /^\d/.test(o.counterpartyHandle) ? o.counterpartyHandle : `@${o.counterpartyHandle}`;
  return "รอรับรายการ";
}
