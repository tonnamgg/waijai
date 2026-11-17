import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";
import { HttpError } from "@/lib/http";
import { formatTHB } from "@/lib/money";
import { formatDateFull, formatDateTime } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/** ใบเสร็จ — เปิดแล้วสั่งพิมพ์ / บันทึกเป็น PDF ได้จากเบราว์เซอร์ */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  const payment = await prisma.payment.findFirst({ where: { orderId: id, status: "succeeded" } });
  const ledger = await prisma.ledgerEntry.findMany({ where: { orderId: id }, orderBy: { createdAt: "asc" } });
  const methodLabel: Record<string, string> = { promptpay: "พร้อมเพย์ QR", card: "บัตรเครดิต / เดบิต", mobile_banking: "โมบายแบงกิ้ง" };
  const ledgerLabel: Record<string, string> = { HOLD: "พักเงิน", RELEASE_TO_SELLER: "โอนให้ผู้ขาย", REFUND_TO_BUYER: "คืนเงินผู้ซื้อ", FEE: "ค่าบริการตัวกลาง" };

  return (
    <main className="bg-white px-6 py-8 text-ink">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[20px] font-bold leading-tight">ไว้ใจ</p>
            <p className="text-[12px] text-muted">ตัวกลางพักเงินซื้อขายออนไลน์</p>
          </div>
        </div>
        <p className="text-right text-[12px] text-muted">
          ใบเสร็จรับเงิน
          <br />
          {formatDateFull(order.releasedAt ?? order.updatedAt)}
        </p>
      </div>

      <div className="mt-6 rounded-card border border-line p-5 text-[14px]">
        <Row k="เลขรายการ" v={order.code} />
        <Row k="สินค้า" v={order.title} />
        <Row k="ผู้ซื้อ" v={order.buyer ? `${order.buyer.displayName} (@${order.buyer.username})` : "-"} />
        <Row k="ผู้ขาย" v={order.seller ? `${order.seller.displayName} (@${order.seller.username})` : "-"} />
        <Row k="สถานะ" v={order.status} />
        {payment && <Row k="ชำระด้วย" v={`${methodLabel[payment.method] ?? payment.method} · ${formatDateTime(payment.createdAt)}`} />}
        {order.trackingNo && <Row k="เลขพัสดุ" v={`${order.trackingNo} (${order.carrier ?? "-"})`} />}
        <div className="my-3 h-px bg-line" />
        <Row k="ราคาสินค้า" v={formatTHB(order.priceSatang, { forceDecimals: true })} />
        <Row k="ค่าบริการตัวกลาง" v={formatTHB(order.feeSatang, { forceDecimals: true })} />
        <Row k="รวมที่ผู้ซื้อชำระ" v={formatTHB(order.priceSatang + order.feeSatang, { forceDecimals: true })} bold />
      </div>

      <h2 className="mt-6 text-[14px] font-bold">บันทึกการเคลื่อนไหวของเงิน</h2>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          {ledger.map((l) => (
            <tr key={l.id} className="border-b border-line">
              <td className="py-2 text-muted">{formatDateTime(l.createdAt)}</td>
              <td className="py-2">{ledgerLabel[l.type] ?? l.type}</td>
              <td className="tabular py-2 text-right">{formatTHB(l.amountSatang, { forceDecimals: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-center text-[11px] text-muted">เอกสารนี้ออกโดยระบบไว้ใจ (เวอร์ชันทดลอง) · ไม่ใช่ใบกำกับภาษี</p>
      <PrintButton />
    </main>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="shrink-0 text-muted">{k}</span>
      <span className={bold ? "tabular text-right font-bold" : "tabular text-right"}>{v}</span>
    </div>
  );
}
