import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, userActor } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { applyTransition, getOrderForUser } from "@/lib/orders";
import { disputeInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/**
 * เปิดข้อพิพาท
 * - DELIVERED → ไม่ตรงปก (ต้องมีหลักฐานรูป/วิดีโอ)
 * - SHIPPED   → ของไม่มา (เกิน DELIVERY_MAX_DAYS)
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = disputeInputSchema.parse(await readJson(req));
  const order = await getOrderForUser(id, user);
  if (order.dispute) throw new HttpError(409, "รายการนี้มีข้อพิพาทอยู่แล้ว");

  const createDispute = async (tx: Prisma.TransactionClient) => {
    await tx.dispute.create({
      data: { orderId: id, reason: input.reason, detail: input.detail, mismatchItems: JSON.stringify(input.mismatchItems) },
    });
  };

  if (order.status === "SHIPPED") {
    await applyTransition(id, { type: "REPORT_NOT_RECEIVED" }, userActor(user), {
      extra: async (tx) => {
        await tx.dispute.create({ data: { orderId: id, reason: "NOT_RECEIVED", detail: input.detail, mismatchItems: "[]" } });
      },
    });
    return { ok: true };
  }

  const evidence = await prisma.orderMedia.count({
    where: { orderId: id, uploadedBy: user.id, kind: { in: ["DISPUTE_EVIDENCE", "RECEIVED", "UNBOXING_VIDEO"] } },
  });
  await applyTransition(id, { type: "DISPUTE", hasEvidence: evidence > 0 }, userActor(user), { extra: createDispute });
  return { ok: true };
});
