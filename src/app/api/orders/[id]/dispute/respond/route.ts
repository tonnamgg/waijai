import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { disputeResponseSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/** ผู้ขายส่งคำชี้แจง/หลักฐานโต้แย้ง (รูปอัปโหลดผ่าน /api/uploads kind=DISPUTE_EVIDENCE) */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { text } = disputeResponseSchema.parse(await readJson(req));
  const order = await getOrderForUser(id, user);
  if (order.sellerId !== user.id) throw new HttpError(403, "เฉพาะผู้ขายเท่านั้น");
  if (order.status !== "DISPUTED" || !order.dispute) throw new HttpError(409, "ไม่มีข้อพิพาทที่เปิดอยู่");
  await prisma.dispute.update({ where: { orderId: id }, data: { sellerResponse: text } });
  return { ok: true };
});
