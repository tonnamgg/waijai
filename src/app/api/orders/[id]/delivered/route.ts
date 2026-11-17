import { requireUser, userActor } from "@/lib/auth";
import { route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForUser(id, user);
  if (order.status === "DELIVERED" && order.buyerId === user.id) return { ok: true, already: true };
  await applyTransition(id, { type: "MARK_DELIVERED" }, userActor(user));
  return { ok: true };
});
