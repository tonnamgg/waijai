import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { processDeadlines } from "@/lib/deadlines";
import { config, DAY } from "@/lib/config";

type Ctx = { params: Promise<{ id: string }> };

/**
 * โหมดทดสอบ (ปิดใน production): ย้อนเวลา deadline ของรายการให้หมดเวลาทันที แล้วรัน cron
 * ใช้ทดสอบ auto-cancel / auto-refund / auto-release / แจ้งของไม่มา (14 วัน)
 * หมายเหตุ: แก้เฉพาะ deadline/timestamp — สถานะยังเปลี่ยนผ่าน state machine เท่านั้น
 */
export const POST = route<Ctx>(async (_req, { params }) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_TOOLS !== "1") throw new HttpError(404, "not found");
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForUser(id, user);
  const past = new Date(Date.now() - 1000);

  switch (order.status) {
    case "CREATED":
      await prisma.order.update({ where: { id }, data: { paymentDeadline: past } });
      break;
    case "PAID_HELD":
      await prisma.order.update({ where: { id }, data: { shipDeadline: past } });
      break;
    case "SHIPPED":
      await prisma.order.update({ where: { id }, data: { shippedAt: new Date(Date.now() - config.DELIVERY_MAX_DAYS * DAY - 60_000) } });
      break;
    case "DELIVERED":
      await prisma.order.update({ where: { id }, data: { inspectDeadline: past } });
      break;
    default:
      throw new HttpError(409, "สถานะนี้ไม่มี deadline ให้ข้าม");
  }
  const result = await processDeadlines();
  return { ok: true, result };
});
