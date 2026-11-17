/**
 * งานตั้งเวลา (SPEC ข้อ 2 + Milestone 7)
 * เรียกจาก /api/cron/tick และจาก instrumentation (ทุก 1 นาทีตอนรัน dev/start)
 * ปลอดภัยต่อการรันซ้ำ: applyTransition ใช้ optimistic lock + ledger idempotent
 */
import { prisma } from "./db";
import { applyTransition } from "./orders";
import type { OrderEventType } from "./order-machine";

export async function processDeadlines(now = new Date()) {
  const result = { cancelled: 0, refunded: 0, released: 0, errors: [] as string[] };

  const jobs: { status: string; field: "paymentDeadline" | "shipDeadline" | "inspectDeadline"; event: OrderEventType; key: keyof typeof result }[] = [
    { status: "CREATED", field: "paymentDeadline", event: { type: "PAYMENT_EXPIRED" }, key: "cancelled" },
    { status: "PAID_HELD", field: "shipDeadline", event: { type: "SHIP_EXPIRED" }, key: "refunded" },
    { status: "DELIVERED", field: "inspectDeadline", event: { type: "INSPECT_EXPIRED" }, key: "released" },
  ];

  for (const job of jobs) {
    const due = await prisma.order.findMany({
      where: { status: job.status, [job.field]: { lte: now } },
      select: { id: true },
    });
    for (const { id } of due) {
      try {
        await applyTransition(id, job.event, { kind: "system" }, { now });
        (result[job.key] as number)++;
      } catch (e) {
        result.errors.push(`${id}: ${(e as Error).message}`);
      }
    }
  }
  return result;
}
