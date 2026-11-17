import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { bahtToSatang, calcFee } from "@/lib/money";
import { createOrderSchema, parseChecklist } from "@/lib/validators";
import { generateCodes, orderInclude, toDTO } from "@/lib/orders";
import { config, HOUR } from "@/lib/config";
import { HttpError } from "@/lib/http";

export const GET = route(async () => {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }, { createdById: user.id }] },
    include: orderInclude,
    orderBy: { updatedAt: "desc" },
  });
  return { orders: orders.map(toDTO) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = createOrderSchema.parse(await readJson(req));

  const priceSatang = bahtToSatang(input.price);
  if (priceSatang < 100) throw new HttpError(400, "ราคาต้องอย่างน้อย ฿1");
  if (priceSatang > 1_000_000_00) throw new HttpError(400, "ราคาสูงสุด ฿1,000,000 ต่อรายการ");

  const handle = input.counterparty.replace(/^@/, "").trim();
  if (handle && handle === user.username) throw new HttpError(400, "อีกฝ่ายต้องไม่ใช่ตัวคุณเอง");

  const checklist = parseChecklist(input.specText);
  const { code, shareCode } = await generateCodes();
  const now = new Date();

  const order = await prisma.order.create({
    data: {
      code,
      shareCode,
      title: input.title,
      specText: input.specText,
      checklistItems: JSON.stringify(checklist),
      priceSatang,
      feeSatang: calcFee(priceSatang),
      createdById: user.id,
      creatorRole: input.role,
      counterpartyHandle: handle ? (/^\d+$/.test(handle) ? handle : `@${handle}`) : null,
      buyerId: input.role === "BUYER" ? user.id : null,
      sellerId: input.role === "SELLER" ? user.id : null,
      paymentDeadline: new Date(now.getTime() + config.PAYMENT_DEADLINE_HOURS * HOUR),
      media: {
        create: input.photoUrls.map((url) => ({ kind: "LISTING", url, uploadedBy: user.id })),
      },
      events: { create: { from: null, to: "CREATED", actor: user.id, note: "สร้างรายการ" } },
    },
  });
  return { id: order.id, code: order.code, shareCode: order.shareCode, shareUrl: `/o/${order.shareCode}` };
});
