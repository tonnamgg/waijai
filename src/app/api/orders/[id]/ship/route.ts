import { prisma } from "@/lib/db";
import { requireUser, userActor } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";
import { shipInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = shipInputSchema.parse(await readJson(req));
  await getOrderForUser(id, user);
  const packing = await prisma.orderMedia.count({ where: { orderId: id, kind: "PACKING", uploadedBy: user.id } });
  await applyTransition(id, { type: "SHIP", carrier: input.carrier, trackingNo: input.trackingNo, hasPackingPhoto: packing > 0 }, userActor(user));
  return { ok: true };
});
