"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronDown,
  CircleSlash,
  Clock,
  FlaskConical,
  Hourglass,
  Link2,
  Lock,
  PackageCheck,
  RotateCcw,
  Scale,
  Truck,
  Undo2,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/ui/TopBar";
import { Thumb } from "@/components/ui/Thumb";
import { Pill } from "@/components/ui/Pill";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Timeline } from "@/components/Timeline";
import { Countdown } from "@/components/Countdown";
import { CopyButton } from "@/components/CopyButton";
import { MediaPicker } from "@/components/MediaPicker";
import { api, type Uploaded } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { buildSteps } from "@/lib/timeline";
import { formatTHB } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { DAY } from "@/lib/config";
import { ACTIVE_STATUSES, CARRIERS, DISPUTE_REASON_LABEL, type DisputeReason, type Role } from "@/lib/types";
import type { OrderDTO } from "@/lib/orders";

type Props = {
  order: OrderDTO;
  role: Role | null;
  me: { id: string; username: string; isAdmin: boolean };
  otherUsername: string | null;
  deliveryMaxDays: number;
  devTools: boolean;
};

export function OrderTracking({ order: o, role, me, otherUsername, deliveryMaxDays, devTools }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [notReceivedOpen, setNotReceivedOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isBuyer = role === "BUYER";
  const isSeller = role === "SELLER";
  const isCreator = o.createdById === me.id;
  const steps = useMemo(() => buildSteps(o, role), [o, role]);
  const thumb = o.media.find((m) => m.kind === "LISTING")?.url;
  const other = isSeller ? o.buyer : o.seller;
  const otherLabel = other ? `@${other.username}` : o.counterpartyHandle ?? "รอรับรายการ";
  const amount = isSeller ? o.priceSatang : o.priceSatang + o.feeSatang;
  const held = ACTIVE_STATUSES.includes(o.status);
  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/o/${o.shareCode}` : `/o/${o.shareCode}`;

  // รีเฟรชข้อมูลเป็นระยะ (เห็นการกระทำของอีกฝ่าย / cron)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  const refresh = useCallback(() => router.refresh(), [router]);

  async function run(key: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await fn();
      if (success) toast(success);
      router.refresh();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function receivedAndInspect() {
    const ok = await run("delivered", () => api(`/api/orders/${o.id}/delivered`));
    if (ok) router.push(`/orders/${o.id}/inspect`);
  }

  const canReportNotReceived = !!o.shippedAt && Date.now() - new Date(o.shippedAt).getTime() >= deliveryMaxDays * DAY;

  return (
    <main className="pb-44">
      <TopBar title="ติดตามสถานะ" back="/" />
      <div className="space-y-5 px-5">
        {/* การ์ดสรุป */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card p-5">
          <div className="flex gap-4">
            <Thumb src={thumb} size={72} icon="image" />
            <div className="min-w-0 flex-1 pt-1">
              <p className="truncate text-[18px] font-semibold">{o.title}</p>
              <p className="mt-0.5 text-[15px] text-muted">
                {isSeller ? "ขายให้" : "จาก"} {otherLabel}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">{o.code}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-1">
              <span className="tabular text-[20px] font-bold">{formatTHB(amount)}</span>
              {held ? (
                <span className="flex items-center gap-1 text-[14px] font-semibold text-accent-dark">
                  <Lock className="h-4 w-4" strokeWidth={2.2} /> พักไว้แล้ว
                </span>
              ) : (
                <StatusPill status={o.status} role={role} />
              )}
            </div>
          </div>
          <AnimatePresence>
            {o.trackingNo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                <div className="mt-4 flex items-center justify-between rounded-btn bg-soft px-5 py-3.5">
                  <div>
                    <p className="text-[13px] text-muted">เลขพัสดุ{o.carrier ? ` · ${o.carrier}` : ""}</p>
                    <p className="tabular text-[18px] font-bold tracking-wide">{o.trackingNo}</p>
                  </div>
                  <CopyButton text={o.trackingNo} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* แบนเนอร์ตามสถานะ */}
        <StatusBanner o={o} role={role} isCreator={isCreator} shareLink={shareLink} />

        {o.status === "DISPUTED" && o.dispute && <DisputeCard o={o} isSeller={isSeller} myId={me.id} onDone={refresh} />}

        {/* Timeline */}
        <section className="pt-1">
          <Timeline steps={steps} />
        </section>

        {/* โหมดทดสอบ */}
        {devTools && (
          <DevPanel o={o} otherUsername={otherUsername} isAdmin={me.isAdmin} onChanged={refresh} />
        )}
      </div>

      {/* ปุ่มตามบทบาท/สถานะ */}
      <BottomActions>
        {isBuyer && o.status === "CREATED" && o.seller && (
          <Button onClick={() => router.push(`/orders/${o.id}/pay`)}>จ่ายเงินเข้าตัวกลาง · {formatTHB(o.priceSatang + o.feeSatang)}</Button>
        )}
        {isCreator && o.status === "CREATED" && (
          <button onClick={() => setCancelOpen(true)} className="mt-2 w-full py-2 text-center text-[15px] text-muted hover:text-ink">
            ยกเลิกรายการ
          </button>
        )}
        {isSeller && o.status === "PAID_HELD" && (
          <Button icon={<Truck className="h-5 w-5" />} onClick={() => setShipOpen(true)}>
            ส่งของแล้ว · ใส่เลขพัสดุ
          </Button>
        )}
        {isBuyer && o.status === "SHIPPED" && (
          <>
            <Button loading={busy === "delivered"} onClick={receivedAndInspect}>
              ได้รับของแล้ว · ตรวจสอบสินค้า
            </Button>
            <button
              onClick={() =>
                canReportNotReceived
                  ? setNotReceivedOpen(true)
                  : toast(`แจ้ง "ของไม่มา" ได้เมื่อผู้ขายส่งของเกิน ${deliveryMaxDays} วัน ระหว่างนี้ติดตามด้วยเลขพัสดุได้เลย`, "info")
              }
              className="mt-2 w-full py-2 text-center text-[16px] text-[#3E3E3A] hover:text-ink"
            >
              ยังไม่ได้ของ? แจ้งปัญหา
            </button>
          </>
        )}
        {isBuyer && o.status === "DELIVERED" && <Button onClick={() => router.push(`/orders/${o.id}/inspect`)}>ตรวจสอบสินค้า · ก่อนปล่อยเงิน</Button>}
        {isBuyer && o.status === "RELEASED" && (
          <Button variant="secondary" onClick={() => router.push(`/orders/${o.id}/done`)}>
            ดูสรุปรายการ / ให้คะแนนผู้ขาย
          </Button>
        )}
      </BottomActions>

      <ShipSheet open={shipOpen} onClose={() => setShipOpen(false)} order={o} onShipped={() => { setShipOpen(false); refresh(); }} />

      <NotReceivedSheet open={notReceivedOpen} onClose={() => setNotReceivedOpen(false)} orderId={o.id} onDone={() => { setNotReceivedOpen(false); refresh(); }} />

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="ยกเลิกรายการนี้?">
        <p className="text-[15px] text-muted">ลิงก์ที่ส่งให้อีกฝ่ายจะใช้ไม่ได้ และยกเลิกแล้วย้อนกลับไม่ได้</p>
        <div className="mt-5 space-y-2.5">
          <Button
            variant="warn"
            loading={busy === "cancel"}
            onClick={async () => {
              if (await run("cancel", () => api(`/api/orders/${o.id}/cancel`), "ยกเลิกรายการแล้ว")) setCancelOpen(false);
            }}
          >
            ยืนยันยกเลิก
          </Button>
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            ไม่ยกเลิก
          </Button>
        </div>
      </Sheet>
    </main>
  );
}

function BottomActions({ children }: { children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.flat() : [children];
  if (!arr.some(Boolean)) return null;
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-6 pt-8"
    >
      {children}
    </motion.div>
  );
}

function Banner({ tone, icon, title, children }: { tone: "accent" | "amber" | "muted"; icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={clsx(
        "flex gap-3 rounded-[16px] p-4",
        tone === "accent" && "bg-accent-soft text-accent-dark",
        tone === "amber" && "bg-warn-soft text-warn-text",
        tone === "muted" && "bg-soft text-ink",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold">{title}</p>
        {children && <div className="mt-1 text-[14px] leading-relaxed text-[#3E3E3A]">{children}</div>}
      </div>
    </motion.section>
  );
}

function StatusBanner({ o, role, isCreator, shareLink }: { o: OrderDTO; role: Role | null; isCreator: boolean; shareLink: string }) {
  const isSeller = role === "SELLER";
  const lastNote = [...o.events].reverse().find((e) => e.to === o.status && e.from !== e.to)?.note;
  const ic = "h-5 w-5";

  if (o.status === "CREATED") {
    const waitingFor = !o.seller ? "ผู้ขาย" : !o.buyer ? "ผู้ซื้อ" : null;
    if (waitingFor && isCreator)
      return (
        <Banner tone="amber" icon={<Link2 className={ic} />} title={`ส่งลิงก์ให้${waitingFor}กดรับรายการ`}>
          <div className="mt-2 flex items-center gap-2 rounded-btn bg-surface p-1.5 pl-3">
            <span className="flex-1 truncate text-[14px] text-ink" suppressHydrationWarning>
              {shareLink}
            </span>
            <CopyButton text={shareLink} />
          </div>
        </Banner>
      );
    if (isSeller)
      return (
        <Banner tone="amber" icon={<Hourglass className={ic} />} title="รอผู้ซื้อชำระเงินเข้าตัวกลาง">
          {o.paymentDeadline && (
            <>
              ผู้ซื้อต้องจ่ายภายใน <Countdown to={o.paymentDeadline} className="tabular font-semibold" />
            </>
          )}
        </Banner>
      );
    return (
      <Banner tone="amber" icon={<Clock className={ic} />} title="กรุณาชำระเงินเข้าตัวกลาง">
        {o.paymentDeadline && (
          <>
            เหลือเวลา <Countdown to={o.paymentDeadline} className="tabular font-semibold" /> ไม่งั้นรายการจะถูกยกเลิกอัตโนมัติ
          </>
        )}
      </Banner>
    );
  }
  if (o.status === "PAID_HELD" && o.shipDeadline)
    return isSeller ? (
      <Banner tone="amber" icon={<Truck className={ic} />} title="ผู้ซื้อจ่ายแล้ว · ส่งของได้เลย">
        ต้องส่งภายใน <Countdown to={o.shipDeadline} className="tabular font-semibold" /> ไม่ส่ง = คืนเงินผู้ซื้ออัตโนมัติ
      </Banner>
    ) : (
      <Banner tone="accent" icon={<Lock className={ic} />} title="ไว้ใจพักเงินไว้แล้ว · รอผู้ขายส่งของ">
        ผู้ขายต้องส่งภายใน <Countdown to={o.shipDeadline} className="tabular font-semibold" /> ไม่ส่ง = คืนเงินอัตโนมัติ
      </Banner>
    );
  if (o.status === "DELIVERED" && o.inspectDeadline)
    return isSeller ? (
      <Banner tone="accent" icon={<PackageCheck className={ic} />} title="ของถึงผู้ซื้อแล้ว · รอตรวจของ">
        ถ้าผู้ซื้อไม่กดอะไรภายใน <Countdown to={o.inspectDeadline} className="tabular font-semibold" /> ระบบจะปล่อยเงินให้คุณอัตโนมัติ
      </Banner>
    ) : (
      <Banner tone="amber" icon={<Clock className={ic} />} title="ตรวจของก่อนปล่อยเงิน">
        เหลือ <Countdown to={o.inspectDeadline} className="tabular font-semibold" /> ถ้าไม่กดอะไร ระบบจะปล่อยเงินให้ผู้ขายอัตโนมัติ
      </Banner>
    );
  if (o.status === "RELEASED")
    return (
      <Banner tone="accent" icon={<BadgeCheck className={ic} />} title={isSeller ? `ได้รับเงิน ${formatTHB(o.priceSatang)} แล้ว` : "ปล่อยเงินให้ผู้ขายแล้ว"}>
        {lastNote} {o.releasedAt && `· ${formatDateTime(o.releasedAt)}`}
      </Banner>
    );
  if (o.status === "REFUNDED")
    return (
      <Banner tone="muted" icon={<Undo2 className={ic} />} title={`คืนเงิน ${formatTHB(o.priceSatang + o.feeSatang)} ให้ผู้ซื้อแล้ว`}>
        {lastNote} {o.refundedAt && `· ${formatDateTime(o.refundedAt)}`}
      </Banner>
    );
  if (o.status === "CANCELLED")
    return (
      <Banner tone="muted" icon={<CircleSlash className={ic} />} title="รายการถูกยกเลิก">
        {lastNote}
      </Banner>
    );
  return null;
}

function DisputeCard({ o, isSeller, myId, onDone }: { o: OrderDTO; isSeller: boolean; myId: string; onDone: () => void }) {
  const d = o.dispute!;
  const toast = useToast();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const evidence = o.media.filter((m) => ["DISPUTE_EVIDENCE", "RECEIVED", "UNBOXING_VIDEO"].includes(m.kind));
  const buyerEv = evidence.filter((m) => m.uploadedBy === o.buyer?.id);
  const sellerEv = evidence.filter((m) => m.uploadedBy === o.seller?.id);

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-warn-soft px-5 py-4 text-warn-text">
        <Scale className="h-5 w-5" />
        <div>
          <p className="text-[16px] font-bold">อยู่ระหว่างตรวจสอบข้อพิพาท</p>
          <p className="text-[13px]">เงินยังพักอยู่กับไว้ใจ · แอดมินจะตัดสินจากหลักฐานทั้งสองฝ่าย</p>
        </div>
      </div>
      <div className="space-y-3 p-5 text-[15px]">
        <p>
          <span className="text-muted">เหตุผล: </span>
          <b>{DISPUTE_REASON_LABEL[d.reason as DisputeReason] ?? d.reason}</b>
        </p>
        <p className="whitespace-pre-wrap rounded-btn bg-soft p-3">{d.detail}</p>
        {d.mismatchItems.length > 0 && (
          <div>
            <p className="mb-1.5 text-muted">รายการที่ไม่ตรง</p>
            <div className="flex flex-wrap gap-1.5">
              {d.mismatchItems.map((m) => (
                <Pill key={m} tone="amber">
                  {m}
                </Pill>
              ))}
            </div>
          </div>
        )}
        <EvidenceRow title="หลักฐานจากผู้ซื้อ" items={buyerEv} />
        <EvidenceRow title="หลักฐานจากผู้ขาย" items={sellerEv} />
        {d.sellerResponse && (
          <div>
            <p className="mb-1 text-muted">คำชี้แจงจากผู้ขาย</p>
            <p className="whitespace-pre-wrap rounded-btn bg-accent-soft p-3 text-accent-dark">{d.sellerResponse}</p>
          </div>
        )}
        {isSeller && (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="font-semibold">{d.sellerResponse ? "แก้ไขคำชี้แจง / เพิ่มหลักฐาน" : "ส่งหลักฐานโต้แย้ง"}</p>
            <MediaPicker value={files} onChange={(v) => { setFiles(v); onDone(); }} orderId={o.id} kind="DISPUTE_EVIDENCE" accept="image/*,video/*" addLabel="หลักฐาน" />
            <textarea className="textarea min-h-[90px]" placeholder="อธิบายฝั่งของคุณ เช่น รูปตอนแพ็กของ สภาพก่อนส่ง" value={text} onChange={(e) => setText(e.target.value)} />
            <Button
              size="md"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/orders/${o.id}/dispute/respond`, { text });
                  toast("ส่งคำชี้แจงแล้ว");
                  setText("");
                  onDone();
                } catch (e) {
                  toast((e as Error).message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              ส่งคำชี้แจง
            </Button>
          </div>
        )}
        {!isSeller && myId === o.buyer?.id && <p className="text-[13px] text-muted">แอดมินจะแจ้งผลภายใน 3 วันทำการ</p>}
      </div>
    </motion.section>
  );
}

function EvidenceRow({ title, items }: { title: string; items: OrderDTO["media"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-muted">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map((m) => (
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-btn bg-soft">
            {m.mime.startsWith("video/") ? (
              <video src={m.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function ShipSheet({ open, onClose, order, onShipped }: { open: boolean; onClose: () => void; order: OrderDTO; onShipped: () => void }) {
  const toast = useToast();
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [trackingNo, setTrackingNo] = useState("");
  const existing = order.media.filter((m) => m.kind === "PACKING").map((m) => ({ url: m.url, mime: m.mime }));
  const [photos, setPhotos] = useState<Uploaded[]>(existing);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (photos.length === 0) return toast("กรุณาแนบรูปตอนแพ็กของอย่างน้อย 1 รูป", "error");
    setBusy(true);
    try {
      await api(`/api/orders/${order.id}/ship`, { carrier, trackingNo });
      toast("แจ้งส่งของแล้ว ผู้ซื้อจะได้รับเลขพัสดุทันที");
      onShipped();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="ส่งของแล้ว · ใส่เลขพัสดุ">
      <div className="space-y-4">
        {order.shipDeadline && (
          <p className="flex items-center gap-2 rounded-btn bg-warn-soft px-4 py-3 text-[14px] text-warn-text">
            <Clock className="h-4 w-4" /> ต้องส่งภายใน <Countdown to={order.shipDeadline} className="tabular font-bold" />
          </p>
        )}
        <div>
          <span className="label">ขนส่ง</span>
          <div className="flex flex-wrap gap-2">
            {CARRIERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarrier(c)}
                className={clsx("relative h-10 rounded-pill px-4 text-[14px] font-semibold transition-colors", carrier === c ? "text-white" : "bg-soft text-muted")}
              >
                {carrier === c && <motion.span layoutId="carrier" className="absolute inset-0 rounded-pill bg-accent" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                <span className="relative">{c}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">เลขพัสดุ</span>
          <input className="input tabular uppercase tracking-wide" value={trackingNo} placeholder="เช่น TH0123456789" onChange={(e) => setTrackingNo(e.target.value)} />
        </label>
        <div>
          <span className="label">รูปตอนแพ็กของ (บังคับ)</span>
          <MediaPicker value={photos} onChange={setPhotos} orderId={order.id} kind="PACKING" addLabel="ถ่ายรูป" />
        </div>
        <Button onClick={submit} loading={busy} icon={<Truck className="h-5 w-5" />}>
          ยืนยันส่งของ
        </Button>
      </div>
    </Sheet>
  );
}

function NotReceivedSheet({ open, onClose, orderId, onDone }: { open: boolean; onClose: () => void; orderId: string; onDone: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="แจ้งว่ายังไม่ได้รับของ">
      <p className="text-[15px] text-muted">ไว้ใจจะเปิดข้อพิพาท เงินยังพักอยู่จนกว่าแอดมินจะตรวจสอบกับขนส่งและผู้ขาย</p>
      <textarea className="textarea mt-4 min-h-[110px]" placeholder="เช่น สถานะพัสดุไม่ขยับมา 10 วัน ติดต่อผู้ขายไม่ได้" value={detail} onChange={(e) => setDetail(e.target.value)} />
      <div className="mt-4">
        <Button
          variant="warn"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/orders/${orderId}/dispute`, { reason: "NOT_RECEIVED", detail, mismatchItems: [] });
              toast("เปิดข้อพิพาทแล้ว");
              onDone();
            } catch (e) {
              toast((e as Error).message, "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          ยืนยันแจ้งปัญหา
        </Button>
      </div>
    </Sheet>
  );
}

function DevPanel({ o, otherUsername, isAdmin, onChanged }: { o: OrderDTO; otherUsername: string | null; isAdmin: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const ffLabel: Partial<Record<OrderDTO["status"], string>> = {
    CREATED: "ข้ามไปหมดเวลาชำระ → ยกเลิกอัตโนมัติ",
    PAID_HELD: "ข้ามไปเลยกำหนดส่ง → คืนเงินอัตโนมัติ",
    SHIPPED: "ข้ามไป 14 วันหลังส่ง → แจ้ง 'ของไม่มา' ได้",
    DELIVERED: "ข้ามไปหมดเวลาตรวจ → ปล่อยเงินอัตโนมัติ",
  };

  async function act(key: string, fn: () => Promise<unknown>, msg: string, after?: () => void) {
    setBusy(key);
    try {
      await fn();
      toast(msg, "info");
      after ? after() : onChanged();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-[16px] border border-dashed border-field">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-semibold text-muted">
        <span className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" /> โหมดทดสอบ (สำหรับเดโม)
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 px-4 pb-4">
              {otherUsername && (
                <Button
                  size="md"
                  variant="secondary"
                  icon={<UserRoundCog className="h-4 w-4" />}
                  loading={busy === "switch"}
                  onClick={() => act("switch", () => api("/api/auth/switch", { username: otherUsername }), `สลับเป็น @${otherUsername} แล้ว`, () => router.refresh())}
                >
                  สลับเป็นอีกฝ่าย (@{otherUsername})
                </Button>
              )}
              {ffLabel[o.status] && (
                <Button
                  size="md"
                  variant="secondary"
                  icon={<RotateCcw className="h-4 w-4" />}
                  loading={busy === "ff"}
                  onClick={() => act("ff", () => api(`/api/dev/fast-forward/${o.id}`), "ข้ามเวลาแล้ว · รัน cron เรียบร้อย")}
                >
                  {ffLabel[o.status]}
                </Button>
              )}
              {o.status === "DISPUTED" && (
                <Link href="/admin/disputes" className="block text-center text-[14px] font-semibold text-accent underline">
                  ไปหน้าแอดมินตัดสินข้อพิพาท {isAdmin ? "" : "(ต้องสลับเป็น @admin ที่หน้าบัญชี)"}
                </Link>
              )}
              <p className="text-[12px] leading-relaxed text-muted">
                ปุ่มนี้แก้เฉพาะเวลา deadline แล้วให้ cron ทำงาน — การเปลี่ยนสถานะยังผ่าน state machine ตามกติกาเดิม
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
