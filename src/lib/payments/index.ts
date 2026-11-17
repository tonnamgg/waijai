import { prisma } from "../db";
import { applyTransition } from "../orders";
import { MockPaymentProvider } from "./mock";
import type { PaymentProvider, WebhookPayload } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER ?? "mock") {
    // case "omise": return OmiseProvider;  // Milestone 10
    default:
      return MockPaymentProvider;
  }
}

/** ประมวลผล webhook — idempotent: ยิงซ้ำกี่ครั้งก็ PAID_HELD ครั้งเดียว */
export async function handlePaymentWebhook(p: WebhookPayload) {
  const payment = await prisma.payment.findUnique({ where: { providerRef: p.providerRef } });
  if (!payment) return { ok: false, reason: "unknown payment" };
  if (payment.status === "succeeded") return { ok: true, duplicate: true, orderId: payment.orderId };

  if (p.status === "failed") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return { ok: true, orderId: payment.orderId };
  }

  await applyTransition(payment.orderId, { type: "PAYMENT_SUCCEEDED" }, { kind: "system" }, {
    extra: async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
    },
  });
  return { ok: true, orderId: payment.orderId };
}
