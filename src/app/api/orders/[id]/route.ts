import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { getOrderForUser, toDTO, viewRole } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForUser(id, user);
  return { order: toDTO(order), role: viewRole(order, user.id) };
});
