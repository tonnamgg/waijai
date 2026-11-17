import type { PaymentMethod } from "../types";

export interface CreateIntentInput {
  orderId: string;
  amountSatang: number;
  method: PaymentMethod;
}

export interface PaymentIntent {
  providerRef: string;
  /** สำหรับ mock: callback ที่ "gateway" จะยิงกลับมา (body + signature) */
  simulatedWebhook?: { body: string; signature: string };
  /** สำหรับ gateway จริง: URL / QR payload ที่ต้องพาผู้ใช้ไป */
  qrPayload?: string;
  redirectUrl?: string;
}

export interface WebhookPayload {
  providerRef: string;
  status: "succeeded" | "failed";
}

export interface PaymentProvider {
  name: string;
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
  verifyWebhook(rawBody: string, signature: string | null): WebhookPayload | null;
}
