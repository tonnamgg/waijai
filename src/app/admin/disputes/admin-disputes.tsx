"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gavel, Timer, Undo2, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { staggerParent, fadeUp } from "@/components/ui/motion";
import { formatTHB } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { DISPUTE_REASON_LABEL, type DisputeReason } from "@/lib/types";
import type { OrderDTO } from "@/lib/orders";

export function AdminDisputes({ orders, counts }: { orders: OrderDTO[]; counts: Record<string, number> }) {
  const router = useRouter();
  const toast = useToast();
  const [ticking, setTicking] = useState(false);
  const [pending, setPending] = useState<{ order: OrderDTO; resolution: "REFUND" | "RELEASE" } | null>(null);
  const [busy, setBusy] = useState(false);
  const open = orders.filter((o) => o.status === "DISPUTED");
  const closed = orders.filter((o) => o.status !== "DISPUTED");

  async function tick() {
    setTicking(true);
    try {
      const r = await api<{ cancelled: number; refunded: number; released: number }>("/api/cron/tick");
      toast(`cron: ยกเลิก ${r.cancelled} · คืนเงิน ${r.refunded} · ปล่อยเงิน ${r.released}`, "info");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setTicking(false);
    }
  }

  async function resolve() {
    if (!pending) return;
    setBusy(true);
    try {
      await api(`/api/admin/disputes/${pending.order.id}/resolve`, { resolution: pending.resolution });
      toast(pending.resolution === "REFUND" ? "คืนเงินผู้ซื้อแล้ว" : "ปล่อยเงินให้ผู้ขายแล้ว");
      setPending(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-5">
      <section className="grid grid-cols-4 gap-2 text-center">
        {[
          ["DISPUTED", "รอตัดสิน"],
          ["PAID_HELD", "รอส่ง"],
          ["DELIVERED", "รอตรวจ"],
          ["RELEASED", "จบแล้ว"],
        ].map(([k, label]) => (
          <div key={k} className="rounded-[14px] bg-soft p-3">
            <p className="text-[20px] font-bold">{counts[k] ?? 0}</p>
            <p className="text-[12px] text-muted">{label}</p>
          </div>
        ))}
      </section>

      <Button variant="secondary" size="md" icon={<Timer className="h-4 w-4" />} loading={ticking} onClick={tick}>
        รันงานตั้งเวลา (cron tick) ตอนนี้
      </Button>

      <h2 className="text-[18px] font-bold">รอตัดสิน ({open.length})</h2>
      {open.length === 0 && <p className="card p-6 text-center text-[15px] text-muted">ไม่มีข้อพิพาทค้างอยู่</p>}
      <motion.div variants={staggerParent} initial="hidden" animate="show" className="space-y-4">
        <AnimatePresence>
          {open.map((o) => (
            <motion.div key={o.id} variants={fadeUp} exit={{ opacity: 0, x: 60 }} layout>
              <DisputeItem o={o} onResolve={(resolution) => setPending({ order: o, resolution })} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {closed.length > 0 && (
        <>
          <h2 className="pt-2 text-[18px] font-bold">ตัดสินแล้ว</h2>
          <ul className="card overflow-hidden">
            {closed.map((o) => (
              <li key={o.id} className="flex items-center justify-between border-b border-line px-5 py-3 last:border-b-0">
                <Link href={`/orders/${o.id}`} className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{o.title}</p>
                  <p className="text-[13px] text-muted">
                    {o.code} · {o.dispute?.resolvedAt ? formatDateTime(o.dispute.resolvedAt) : ""}
                  </p>
                </Link>
                <Pill tone={o.dispute?.resolution === "REFUND" ? "amber" : "accent"}>{o.dispute?.resolution === "REFUND" ? "คืนเงิน" : "ปล่อยเงิน"}</Pill>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={!!pending} onClose={() => !busy && setPending(null)} title="ยืนยันคำตัดสิน">
        {pending && (
          <>
            <p className="text-[15px] text-muted">
              {pending.resolution === "REFUND"
                ? `คืนเงิน ${formatTHB(pending.order.priceSatang + pending.order.feeSatang)} ให้ @${pending.order.buyer?.username}`
                : `ปล่อยเงิน ${formatTHB(pending.order.priceSatang)} ให้ @${pending.order.seller?.username}`}{" "}
              · ย้อนกลับไม่ได้
            </p>
            <div className="mt-5 space-y-2.5">
              <Button variant={pending.resolution === "REFUND" ? "warn" : "primary"} loading={busy} onClick={resolve}>
                ยืนยัน
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function DisputeItem({ o, onResolve }: { o: OrderDTO; onResolve: (r: "REFUND" | "RELEASE") => void }) {
  const d = o.dispute!;
  const media = o.media.filter((m) => m.kind !== "LISTING");
  const by = (id?: string) => media.filter((m) => m.uploadedBy === id);
  const kindLabel: Record<string, string> = { PACKING: "ตอนแพ็ก", RECEIVED: "ตอนรับ", UNBOXING_VIDEO: "แกะกล่อง", DISPUTE_EVIDENCE: "หลักฐาน" };
  const listing = o.media.find((m) => m.kind === "LISTING");

  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between bg-warn-soft px-5 py-3">
        <span className="flex items-center gap-2 text-[15px] font-bold text-warn-text">
          <Gavel className="h-4 w-4" /> {DISPUTE_REASON_LABEL[d.reason as DisputeReason] ?? d.reason}
        </span>
        <span className="text-[12px] text-warn-text">{formatDateTime(d.createdAt)}</span>
      </div>
      <div className="space-y-3 p-5 text-[14px]">
        <div className="flex justify-between">
          <Link href={`/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
            {o.title} · {o.code}
          </Link>
          <span className="tabular font-bold">{formatTHB(o.priceSatang + o.feeSatang)}</span>
        </div>
        <p className="text-muted">
          ผู้ซื้อ @{o.buyer?.username} · ผู้ขาย @{o.seller?.username}
        </p>
        <div>
          <p className="mb-1 font-semibold">ผู้ซื้อแจ้ง</p>
          <p className="whitespace-pre-wrap rounded-btn bg-soft p-3">{d.detail}</p>
          {d.mismatchItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.mismatchItems.map((m) => (
                <Pill key={m} tone="amber">
                  {m}
                </Pill>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 font-semibold">ผู้ขายชี้แจง</p>
          <p className="whitespace-pre-wrap rounded-btn bg-soft p-3 text-muted">{d.sellerResponse ?? "ยังไม่ได้ชี้แจง"}</p>
        </div>
        <MediaGrid title="รูปประกาศ (ผู้ขาย)" items={listing ? [listing] : []} kindLabel={kindLabel} />
        <MediaGrid title="ไฟล์จากผู้ซื้อ" items={by(o.buyer?.id)} kindLabel={kindLabel} />
        <MediaGrid title="ไฟล์จากผู้ขาย" items={by(o.seller?.id)} kindLabel={kindLabel} />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="warn" size="md" icon={<Undo2 className="h-4 w-4" />} onClick={() => onResolve("REFUND")}>
            คืนเงินผู้ซื้อ
          </Button>
          <Button size="md" icon={<BadgeCheck className="h-4 w-4" />} onClick={() => onResolve("RELEASE")}>
            ปล่อยเงินผู้ขาย
          </Button>
        </div>
      </div>
    </article>
  );
}

function MediaGrid({ title, items, kindLabel }: { title: string; items: OrderDTO["media"]; kindLabel: Record<string, string> }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 font-semibold">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map((m) => (
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-btn bg-soft">
            {m.mime.startsWith("video/") ? (
              <video src={m.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/55 py-0.5 text-center text-[10px] text-white">{kindLabel[m.kind] ?? m.kind}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
