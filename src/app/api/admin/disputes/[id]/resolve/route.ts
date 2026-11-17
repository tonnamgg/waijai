import { requireAdmin } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { applyTransition } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { resolveInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/** [id] = dispute id หรือ order id — แอดมินตัดสิน REFUND / RELEASE */
export const POST = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const { resolution } = resolveInputSchema.parse(await readJson(req));
  const dispute = await prisma.dispute.findFirst({ where: { OR: [{ id }, { orderId: id }] } });
  if (!dispute) throw new HttpError(404, "ไม่พบข้อพิพาท");
  await applyTransition(dispute.orderId, { type: "RESOLVE", resolution }, { kind: "admin", id: admin.id }, {
    extra: async (tx) => {
      await tx.dispute.update({
        where: { id: dispute.id },
        data: { resolution, resolvedBy: admin.id, resolvedAt: new Date() },
      });
    },
  });
  return { ok: true };
});
