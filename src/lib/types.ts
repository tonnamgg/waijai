export const ORDER_STATUSES = [
  "CREATED",
  "PAID_HELD",
  "SHIPPED",
  "DELIVERED",
  "DISPUTED",
  "RELEASED",
  "REFUNDED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVE_STATUSES: OrderStatus[] = ["PAID_HELD", "SHIPPED", "DELIVERED", "DISPUTED"];
export const OPEN_STATUSES: OrderStatus[] = ["CREATED", ...ACTIVE_STATUSES];
export const FINAL_STATUSES: OrderStatus[] = ["RELEASED", "REFUNDED", "CANCELLED"];

export type MediaKind = "LISTING" | "PACKING" | "RECEIVED" | "UNBOXING_VIDEO" | "DISPUTE_EVIDENCE";
export const MEDIA_KINDS: MediaKind[] = ["LISTING", "PACKING", "RECEIVED", "UNBOXING_VIDEO", "DISPUTE_EVIDENCE"];
export type LedgerType = "HOLD" | "RELEASE_TO_SELLER" | "REFUND_TO_BUYER" | "FEE";
export type DisputeReason = "NOT_RECEIVED" | "NOT_AS_DESCRIBED" | "DAMAGED" | "OTHER";
export type PaymentMethod = "promptpay" | "card" | "mobile_banking";
export type Role = "BUYER" | "SELLER";

export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  NOT_RECEIVED: "ไม่ได้รับของ",
  NOT_AS_DESCRIBED: "ของไม่ตรงปก",
  DAMAGED: "ของเสียหาย / ชำรุด",
  OTHER: "อื่น ๆ",
};

export const CARRIERS = ["ไปรษณีย์ไทย", "Kerry Express", "Flash Express", "J&T Express", "อื่น ๆ"] as const;
