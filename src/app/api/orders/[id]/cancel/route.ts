import { requireUser, userActor } from "@/lib/auth";
import { route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOrderForUser(id, user);
  await applyTransition(id, { type: "CANCEL" }, userActor(user));
  return { ok: true };
});
