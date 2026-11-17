/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { calcFee } from "../src/lib/money";
import { config, HOUR } from "../src/lib/config";

const prisma = new PrismaClient();
const now = Date.now();
const ago = (h: number) => new Date(now - h * HOUR);
const later = (h: number) => new Date(now + h * HOUR);

// รูปสินค้าตัวอย่าง (SVG เส้นแบบ lucide)
const ICONS: Record<string, string> = {
  headphones:
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  shirt:
    '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
};
function writeSeedImage(name: string, icon: string, bg: string, fg: string) {
  const dir = path.join(process.cwd(), "uploads");
  mkdirSync(dir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><g transform="translate(110 110) scale(7.5)" fill="none" stroke="${fg}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g></svg>`;
  writeFileSync(path.join(dir, name), svg);
  return `/api/files/${name}`;
}

async function main() {
  console.log("Resetting data...");
  await prisma.rating.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.orderMedia.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();

  const [mint, gadget, ploy, film] = await Promise.all([
    prisma.user.create({ data: { username: "mint", displayName: "มินท์", phone: "0810000001", kycVerified: true } }),
    prisma.user.create({ data: { username: "gadgetbkk", displayName: "Gadget BKK", phone: "0810000002", kycVerified: true } }),
    prisma.user.create({ data: { username: "ploy.p", displayName: "พลอย", phone: "0810000003" } }),
    prisma.user.create({ data: { username: "filmhouse", displayName: "Film House", phone: "0810000004", kycVerified: true } }),
  ]);
  await prisma.user.create({ data: { username: "admin", displayName: "แอดมินไว้ใจ", role: "admin", kycVerified: true } });

  const img = {
    headphones: writeSeedImage("seed-headphones.svg", "headphones", "#E7ECEA", "#1F2A27"),
    jacket: writeSeedImage("seed-jacket.svg", "shirt", "#DCE6F2", "#2B4A73"),
    camera: writeSeedImage("seed-camera.svg", "camera", "#F2EADF", "#5C4425"),
  };

  // 1) หูฟัง — มินท์ซื้อจาก @gadgetbkk — กำลังจัดส่ง
  {
    const price = 1290_00;
    const fee = calcFee(price);
    const o = await prisma.order.create({
      data: {
        code: "WJ-24811",
        shareCode: "hdphn01",
        title: "หูฟังไร้สาย สีดำ",
        specText: "สีดำ ตามรูป\nรุ่นและขนาดตรงตามที่ตกลง\nสภาพใหม่ ไม่มีรอยตำหนิ\nอุปกรณ์ครบ: สายชาร์จ, กล่อง",
        checklistItems: JSON.stringify(["สีดำ ตามรูป", "รุ่นและขนาดตรงตามที่ตกลง", "สภาพใหม่ ไม่มีรอยตำหนิ", "อุปกรณ์ครบ: สายชาร์จ, กล่อง"]),
        priceSatang: price,
        feeSatang: fee,
        status: "SHIPPED",
        createdById: gadget.id,
        creatorRole: "SELLER",
        buyerId: mint.id,
        sellerId: gadget.id,
        paymentDeadline: later(-50 + config.PAYMENT_DEADLINE_HOURS),
        paidAt: ago(44),
        shipDeadline: new Date(ago(44).getTime() + config.SHIP_DEADLINE_HOURS * HOUR),
        shippedAt: ago(20),
        carrier: "Kerry Express",
        trackingNo: "TH0123456789",
        createdAt: ago(50),
        updatedAt: new Date(now),
      },
    });
    await prisma.orderMedia.createMany({
      data: [
        { orderId: o.id, kind: "LISTING", url: img.headphones, mime: "image/svg+xml", uploadedBy: gadget.id },
        { orderId: o.id, kind: "PACKING", url: img.headphones, mime: "image/svg+xml", uploadedBy: gadget.id },
      ],
    });
    await prisma.orderEvent.createMany({
      data: [
        { orderId: o.id, from: null, to: "CREATED", actor: gadget.id, note: "สร้างรายการ", createdAt: ago(50) },
        { orderId: o.id, from: "CREATED", to: "PAID_HELD", actor: "SYSTEM", note: "ไว้ใจพักเงินไว้", createdAt: ago(44) },
        { orderId: o.id, from: "PAID_HELD", to: "SHIPPED", actor: gadget.id, note: "แนบเลขพัสดุแล้ว", createdAt: ago(20) },
      ],
    });
    await prisma.payment.create({
      data: { orderId: o.id, provider: "mock", providerRef: "mock_seed_1", method: "promptpay", amountSatang: price + fee, status: "succeeded", createdAt: ago(44) },
    });
    await prisma.ledgerEntry.create({ data: { orderId: o.id, type: "HOLD", amountSatang: price + fee, idempotencyKey: `${o.id}:HOLD`, createdAt: ago(44) } });
  }

  // 2) แจ็กเก็ต — มินท์ขายให้ @ploy.p — รอผู้ซื้อตรวจของ
  {
    const price = 890_00;
    const fee = calcFee(price);
    const o = await prisma.order.create({
      data: {
        code: "WJ-24790",
        shareCode: "jckt002",
        title: "แจ็กเก็ตยีนส์",
        specText: "ไซซ์ M สียีนส์ฟอก\nไม่มีรอยขาด ไม่มีคราบ\nกระดุมครบทุกเม็ด",
        checklistItems: JSON.stringify(["ไซซ์ M สียีนส์ฟอก", "ไม่มีรอยขาด ไม่มีคราบ", "กระดุมครบทุกเม็ด"]),
        priceSatang: price,
        feeSatang: fee,
        status: "DELIVERED",
        createdById: mint.id,
        creatorRole: "SELLER",
        buyerId: ploy.id,
        sellerId: mint.id,
        paidAt: ago(70),
        shipDeadline: new Date(ago(70).getTime() + config.SHIP_DEADLINE_HOURS * HOUR),
        shippedAt: ago(50),
        carrier: "Flash Express",
        trackingNo: "TH8800221144",
        deliveredAt: ago(1),
        inspectDeadline: new Date(ago(1).getTime() + config.INSPECT_WINDOW_HOURS * HOUR),
        createdAt: ago(75),
        updatedAt: new Date(now - 60_000),
      },
    });
    await prisma.orderMedia.create({ data: { orderId: o.id, kind: "LISTING", url: img.jacket, mime: "image/svg+xml", uploadedBy: mint.id } });
    await prisma.orderEvent.createMany({
      data: [
        { orderId: o.id, from: null, to: "CREATED", actor: mint.id, note: "สร้างรายการ", createdAt: ago(75) },
        { orderId: o.id, from: "CREATED", to: "PAID_HELD", actor: "SYSTEM", note: "ไว้ใจพักเงินไว้", createdAt: ago(70) },
        { orderId: o.id, from: "PAID_HELD", to: "SHIPPED", actor: mint.id, note: "แนบเลขพัสดุแล้ว", createdAt: ago(50) },
        { orderId: o.id, from: "SHIPPED", to: "DELIVERED", actor: "SYSTEM", note: "ขนส่งแจ้งว่าของถึงแล้ว", createdAt: ago(1) },
      ],
    });
    await prisma.payment.create({
      data: { orderId: o.id, provider: "mock", providerRef: "mock_seed_2", method: "card", amountSatang: price + fee, status: "succeeded", createdAt: ago(70) },
    });
    await prisma.ledgerEntry.create({ data: { orderId: o.id, type: "HOLD", amountSatang: price + fee, idempotencyKey: `${o.id}:HOLD`, createdAt: ago(70) } });
  }

  // 3) กล้องฟิล์ม — มินท์ซื้อจาก @filmhouse — รอผู้ขายส่งของ
  {
    const price = 2400_00;
    const fee = calcFee(price);
    const o = await prisma.order.create({
      data: {
        code: "WJ-24822",
        shareCode: "cmra003",
        title: "กล้องฟิล์มมือสอง",
        specText: "Olympus Trip 35 ใช้งานได้ปกติ\nเลนส์ไม่มีรา ไม่มีฝ้า\nวัดแสงทำงาน\nมีสายคล้องคอ",
        checklistItems: JSON.stringify(["Olympus Trip 35 ใช้งานได้ปกติ", "เลนส์ไม่มีรา ไม่มีฝ้า", "วัดแสงทำงาน", "มีสายคล้องคอ"]),
        priceSatang: price,
        feeSatang: fee,
        status: "PAID_HELD",
        createdById: mint.id,
        creatorRole: "BUYER",
        buyerId: mint.id,
        sellerId: film.id,
        paidAt: ago(5),
        shipDeadline: new Date(ago(5).getTime() + config.SHIP_DEADLINE_HOURS * HOUR),
        createdAt: ago(6),
        updatedAt: new Date(now - 120_000),
      },
    });
    await prisma.orderMedia.create({ data: { orderId: o.id, kind: "LISTING", url: img.camera, mime: "image/svg+xml", uploadedBy: mint.id } });
    await prisma.orderEvent.createMany({
      data: [
        { orderId: o.id, from: null, to: "CREATED", actor: mint.id, note: "สร้างรายการ", createdAt: ago(6) },
        { orderId: o.id, from: "CREATED", to: "PAID_HELD", actor: "SYSTEM", note: "ไว้ใจพักเงินไว้", createdAt: ago(5) },
      ],
    });
    await prisma.payment.create({
      data: { orderId: o.id, provider: "mock", providerRef: "mock_seed_3", method: "promptpay", amountSatang: price + fee, status: "succeeded", createdAt: ago(5) },
    });
    await prisma.ledgerEntry.create({ data: { orderId: o.id, type: "HOLD", amountSatang: price + fee, idempotencyKey: `${o.id}:HOLD`, createdAt: ago(5) } });
  }

  console.log("Seed complete: users mint / gadgetbkk / ploy.p / filmhouse / admin + 3 orders");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
