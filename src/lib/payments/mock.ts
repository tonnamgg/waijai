import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, WebhookPayload } from "./provider";

const secret = () => process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-webhook-secret";

export function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

/** จำลอง gateway: สร้าง intent แล้วคืน webhook ที่เซ็นแล้ว ให้หน้าเว็บยิงกลับหลังแอนิเมชันจ่ายเงิน */
export const MockPaymentProvider: PaymentProvider = {
  name: "mock",
  async createIntent({ method }) {
    const providerRef = `mock_${method}_${randomBytes(8).toString("hex")}`;
    const body = JSON.stringify({ providerRef, status: "succeeded" } satisfies WebhookPayload);
    return {
      providerRef,
      qrPayload: method === "promptpay" ? `00020101021229370016A000000677010111${providerRef}` : undefined,
      simulatedWebhook: { body, signature: sign(body) },
    };
  },
  verifyWebhook(rawBody, signature) {
    if (!signature) return null;
    const expected = Buffer.from(sign(rawBody));
    const got = Buffer.from(signature);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    try {
      const p = JSON.parse(rawBody) as WebhookPayload;
      if (typeof p.providerRef !== "string" || !["succeeded", "failed"].includes(p.status)) return null;
      return p;
    } catch {
      return null;
    }
  },
};
