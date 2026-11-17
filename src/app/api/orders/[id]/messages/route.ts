import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { requireRoomAccess, touchPresence } from "@/lib/room-server";
import { messageInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/** ส่งข้อความในห้องดีล */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { body } = messageInputSchema.parse(await readJson(req));
  const order = await requireRoomAccess(id, user);
  const m = await prisma.message.create({ data: { orderId: order.id, senderId: user.id, body } });
  await touchPresence(order.id, user.id, false);
  return { id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString() };
});
