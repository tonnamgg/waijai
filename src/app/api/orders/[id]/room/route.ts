import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { requireRoomAccess, roomSnapshot, touchPresence } from "@/lib/room-server";
import { roomPollSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/**
 * ห้องดีลเรียกทุก ~2 วินาที:
 * - บันทึกว่าผู้ใช้นี้อยู่ในห้อง (และกำลังพิมพ์ไหม)
 * - คืนข้อความแชท + สถานะออนไลน์ของทุกคน + version ของดีล (ถ้าเปลี่ยน client จะโหลดข้อมูลหลักใหม่)
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { typing } = roomPollSchema.parse(await readJson(req));
  const order = await requireRoomAccess(id, user);
  await touchPresence(order.id, user.id, typing);
  return roomSnapshot(order);
});
