import { requireUser, userActor } from "@/lib/auth";
import { route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

/** ยืนยันตรงปก → RELEASED (กดซ้ำได้อย่างปลอดภัย) */
export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForUser(id, user);
  if (order.status === "RELEASED" && order.buyerId === user.id) return { ok: true, already: true };
  await applyTransition(id, { type: "CONFIRM" }, userActor(user));
  return { ok: true };
});
