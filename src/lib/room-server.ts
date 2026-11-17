import { prisma } from "./db";
import { HttpError } from "./http";
import type { RoomSnapshot } from "./room";

/** ตรวจสิทธิ์เข้าห้องดีล: คู่สัญญา (หรือผู้สร้าง) หรือแอดมิน */
export async function requireRoomAccess(orderId: string, user: { id: string; role: string }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      createdById: true,
      status: true,
      updatedAt: true,
      dispute: { select: { sellerResponse: true, resolvedAt: true } },
      _count: { select: { events: true, media: true } },
    },
  });
  if (!order) throw new HttpError(404, "ไม่พบรายการ");
  const isParty = order.buyerId === user.id || order.sellerId === user.id || order.createdById === user.id;
  if (!isParty && user.role !== "admin") throw new HttpError(403, "คุณไม่ใช่คู่สัญญาของรายการนี้");
  return order;
}

type AccessOrder = Awaited<ReturnType<typeof requireRoomAccess>>;

/** เปลี่ยนเมื่อมีอะไรในดีลขยับ (สถานะ, event, ไฟล์, คำชี้แจง) → client จะ refresh ข้อมูลหลัก */
export function roomVersion(o: AccessOrder) {
  return [o.status, o.updatedAt.toISOString(), o._count.events, o._count.media, o.dispute?.sellerResponse?.length ?? 0, o.dispute?.resolvedAt?.getTime() ?? 0].join("|");
}

export async function roomSnapshot(o: AccessOrder): Promise<RoomSnapshot> {
  const [messages, presence] = await Promise.all([
    prisma.message.findMany({ where: { orderId: o.id }, orderBy: { createdAt: "asc" }, take: 300 }),
    prisma.roomPresence.findMany({ where: { orderId: o.id } }),
  ]);
  return {
    version: roomVersion(o),
    messages: messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() })),
    presence: presence.map((p) => ({ userId: p.userId, seenAt: p.seenAt.toISOString(), typingAt: p.typingAt?.toISOString() ?? null })),
  };
}

export async function touchPresence(orderId: string, userId: string, typing: boolean) {
  const now = new Date();
  await prisma.roomPresence.upsert({
    where: { orderId_userId: { orderId, userId } },
    create: { orderId, userId, seenAt: now, typingAt: typing ? now : null },
    update: { seenAt: now, typingAt: typing ? now : null },
  });
}
