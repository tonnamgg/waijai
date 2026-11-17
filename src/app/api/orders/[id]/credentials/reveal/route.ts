import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { decryptJson, type GameCredential } from "@/lib/secrets";

type Ctx = { params: Promise<{ id: string }> };

/**
 * เปิดดูข้อมูลล็อกอิน — ผู้ซื้อ (หลังผู้ขายส่งแล้ว), ผู้ขาย (ดูที่ตัวเองส่ง), แอดมิน (ตอนตัดสินข้อพิพาท)
 * บันทึกเวลาที่ผู้ซื้อเปิดดูครั้งแรกไว้เป็นหลักฐาน
 */
export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForUser(id, user);
  const cred = await prisma.credential.findUnique({ where: { orderId: id } });
  if (!cred) throw new HttpError(404, "ผู้ขายยังไม่ได้ส่งรหัส");

  const isBuyer = order.buyerId === user.id;
  const allowed = isBuyer || order.sellerId === user.id || user.role === "admin";
  if (!allowed) throw new HttpError(403, "ไม่มีสิทธิ์ดูข้อมูลนี้");
  // คืนเงินผู้ซื้อแล้ว = บัญชีกลับเป็นของผู้ขาย → ผู้ซื้อดูรหัสไม่ได้อีก
  if (isBuyer && !["DELIVERED", "DISPUTED", "RELEASED"].includes(order.status)) throw new HttpError(403, "ดูรหัสไม่ได้ในสถานะนี้");

  if (isBuyer && !cred.revealedAt) await prisma.credential.update({ where: { id: cred.id }, data: { revealedAt: new Date() } });
  return decryptJson<GameCredential>(cred.cipher);
});
