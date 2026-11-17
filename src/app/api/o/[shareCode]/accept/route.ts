import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";

type Ctx = { params: Promise<{ shareCode: string }> };

/** อีกฝ่ายเปิดลิงก์แล้วกดรับรายการ → ผูก buyerId / sellerId */
export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { shareCode } = await params;
  const order = await prisma.order.findUnique({ where: { shareCode } });
  if (!order) throw new HttpError(404, "ไม่พบรายการ ลิงก์อาจไม่ถูกต้อง");
  if (order.buyerId === user.id || order.sellerId === user.id) return { ok: true, id: order.id, already: true };
  if (order.status !== "CREATED") throw new HttpError(409, "รายการนี้ไม่เปิดรับแล้ว");
  if (order.createdById === user.id) throw new HttpError(400, "คุณเป็นคนสร้างรายการนี้เอง ส่งลิงก์ให้อีกฝ่ายกดรับ");

  // ถ้าระบุ @username ไว้และมีผู้ใช้นั้นจริง → ให้เฉพาะคนนั้นรับได้
  const handle = order.counterpartyHandle?.replace(/^@/, "");
  if (handle) {
    const named = await prisma.user.findFirst({ where: { OR: [{ username: handle }, { phone: handle }] } });
    if (named && named.id !== user.id) throw new HttpError(403, `รายการนี้ส่งถึง ${order.counterpartyHandle} เท่านั้น`);
  }

  const asBuyer = order.creatorRole === "SELLER";
  const res = await prisma.order.updateMany({
    where: { id: order.id, status: "CREATED", ...(asBuyer ? { buyerId: null } : { sellerId: null }) },
    data: asBuyer ? { buyerId: user.id } : { sellerId: user.id },
  });
  if (res.count !== 1) throw new HttpError(409, "มีคนรับรายการนี้ไปแล้ว");
  await prisma.orderEvent.create({
    data: { orderId: order.id, from: "CREATED", to: "CREATED", actor: user.id, note: `@${user.username} รับรายการแล้ว` },
  });
  return { ok: true, id: order.id, role: asBuyer ? "BUYER" : "SELLER" };
});
