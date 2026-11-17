import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { ratingInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = ratingInputSchema.parse(await readJson(req));
  const order = await getOrderForUser(id, user);
  if (order.buyerId !== user.id) throw new HttpError(403, "เฉพาะผู้ซื้อเท่านั้นที่ให้คะแนนได้");
  if (order.status !== "RELEASED") throw new HttpError(409, "ให้คะแนนได้หลังรายการเสร็จสมบูรณ์");
  const rating = await prisma.rating.upsert({
    where: { orderId: id },
    create: { orderId: id, stars: input.stars, comment: input.comment || null },
    update: { stars: input.stars, comment: input.comment || null },
  });
  return { ok: true, rating: { stars: rating.stars, comment: rating.comment } };
});
