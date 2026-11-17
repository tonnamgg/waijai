import type { Prisma } from "@prisma/client";
import type { LedgerIntent } from "./order-machine";

/**
 * บันทึกเงินแบบเพิ่มอย่างเดียว + idempotent
 * idempotencyKey ซ้ำ = ไม่บันทึกซ้ำ (กดซ้ำ / cron รันซ้ำ ไม่โอนซ้ำ)
 */
export async function writeLedger(tx: Prisma.TransactionClient, orderId: string, entries: LedgerIntent[]) {
  const written: string[] = [];
  for (const e of entries) {
    const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: e.idempotencyKey } });
    if (existing) continue;
    await tx.ledgerEntry.create({
      data: { orderId, type: e.type, amountSatang: e.amountSatang, idempotencyKey: e.idempotencyKey },
    });
    written.push(e.idempotencyKey);
  }
  return written;
}

/** ยอดเงินที่ยังพักอยู่ของรายการ = HOLD − (RELEASE + FEE + REFUND) */
export function heldBalance(entries: { type: string; amountSatang: number }[]): number {
  return entries.reduce((sum, e) => (e.type === "HOLD" ? sum + e.amountSatang : sum - e.amountSatang), 0);
}
