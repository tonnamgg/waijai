import { requireUser, userActor } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";
import { encryptJson } from "@/lib/secrets";
import { credentialInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/** ผู้ขายส่งข้อมูลล็อกอินรหัสเกม → เก็บแบบเข้ารหัส + PAID_HELD → DELIVERED ใน transaction เดียว */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = credentialInputSchema.parse(await readJson(req));
  const order = await getOrderForUser(id, user);
  if (order.kind !== "GAME_ACCOUNT") throw new HttpError(400, "รายการนี้ไม่ใช่รหัสเกม");
  const cipher = encryptJson({ login: input.login, password: input.password, note: input.note || undefined });

  await applyTransition(id, { type: "DELIVER_CREDENTIALS", hasCredentials: true }, userActor(user), {
    extra: async (tx) => {
      await tx.credential.upsert({ where: { orderId: id }, create: { orderId: id, cipher }, update: { cipher, revealedAt: null } });
    },
  });
  return { ok: true };
});
