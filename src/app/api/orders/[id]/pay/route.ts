import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { payInputSchema } from "@/lib/validators";
import { getPaymentProvider } from "@/lib/payments";

type Ctx = { params: Promise<{ id: string }> };

/** สร้าง payment intent (ยังไม่เปลี่ยนสถานะ — รอ webhook จาก gateway) */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { method } = payInputSchema.parse(await readJson(req));
  const order = await getOrderForUser(id, user);

  if (order.buyerId !== user.id) throw new HttpError(403, "เฉพาะผู้ซื้อเท่านั้นที่จ่ายเงินได้");
  if (order.status !== "CREATED") throw new HttpError(409, "รายการนี้ชำระเงินแล้วหรือถูกยกเลิก");
  if (!order.sellerId) throw new HttpError(422, "รอผู้ขายกดรับรายการก่อน จึงจะจ่ายเงินได้");
  if (order.paymentDeadline && order.paymentDeadline <= new Date()) throw new HttpError(422, "หมดเวลาชำระเงินแล้ว");

  const amountSatang = order.priceSatang + order.feeSatang;
  const provider = getPaymentProvider();
  const intent = await provider.createIntent({ orderId: order.id, amountSatang, method });

  await prisma.payment.create({
    data: { orderId: order.id, provider: provider.name, providerRef: intent.providerRef, method, amountSatang, status: "pending" },
  });

  return { providerRef: intent.providerRef, amountSatang, qrPayload: intent.qrPayload, simulatedWebhook: intent.simulatedWebhook };
});
