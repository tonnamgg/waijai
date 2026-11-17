import { HttpError, route } from "@/lib/http";
import { getPaymentProvider, handlePaymentWebhook } from "@/lib/payments";

/** gateway แจ้งผลการชำระเงิน → ตรวจ signature → PAID_HELD (idempotent) */
export const POST = route(async (req) => {
  const raw = await req.text();
  const payload = getPaymentProvider().verifyWebhook(raw, req.headers.get("x-waijai-signature"));
  if (!payload) throw new HttpError(401, "invalid signature");
  return handlePaymentWebhook(payload);
});
