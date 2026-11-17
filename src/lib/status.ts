import type { OrderStatus, Role } from "./types";

export type Tone = "amber" | "neutral" | "accent" | "muted" | "danger";

const LABELS: Record<OrderStatus, { buyer: string; seller: string; tone: Tone }> = {
  CREATED: { buyer: "รอชำระเงิน", seller: "รอผู้ซื้อจ่าย", tone: "amber" },
  PAID_HELD: { buyer: "รอผู้ขายส่งของ", seller: "ต้องส่งของ", tone: "amber" },
  SHIPPED: { buyer: "กำลังจัดส่ง", seller: "กำลังจัดส่ง", tone: "neutral" },
  DELIVERED: { buyer: "ตรวจของ", seller: "รอผู้ซื้อตรวจของ", tone: "accent" },
  DISPUTED: { buyer: "อยู่ระหว่างตรวจสอบ", seller: "อยู่ระหว่างตรวจสอบ", tone: "amber" },
  RELEASED: { buyer: "เสร็จสิ้น", seller: "ได้รับเงินแล้ว", tone: "muted" },
  REFUNDED: { buyer: "คืนเงินแล้ว", seller: "คืนเงินผู้ซื้อแล้ว", tone: "muted" },
  CANCELLED: { buyer: "ยกเลิก", seller: "ยกเลิก", tone: "muted" },
};

export function statusLabel(status: OrderStatus, role: Role | null): { text: string; tone: Tone } {
  const l = LABELS[status];
  return { text: role === "SELLER" ? l.seller : l.buyer, tone: l.tone };
}
