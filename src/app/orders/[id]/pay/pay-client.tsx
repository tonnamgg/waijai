"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CreditCard, Hourglass, Loader2, Lock, QrCode, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/ui/TopBar";
import { Thumb } from "@/components/ui/Thumb";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Countdown } from "@/components/Countdown";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { Stagger, FadeUp } from "@/components/ui/motion";
import { formatTHB } from "@/lib/money";
import type { OrderDTO } from "@/lib/orders";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { value: PaymentMethod; title: string; sub: string; icon: typeof QrCode }[] = [
  { value: "promptpay", title: "พร้อมเพย์ QR", sub: "สแกนจ่ายผ่านแอปธนาคาร", icon: QrCode },
  { value: "card", title: "บัตรเครดิต / เดบิต", sub: "Visa, Mastercard", icon: CreditCard },
  { value: "mobile_banking", title: "โมบายแบงกิ้ง", sub: "เด้งเข้าแอปธนาคารอัตโนมัติ", icon: Smartphone },
];

type Intent = { providerRef: string; amountSatang: number; qrPayload?: string; simulatedWebhook?: { body: string; signature: string } };
type Phase = "idle" | "waiting" | "confirming" | "success";

export function PayClient({ order }: { order: OrderDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [phase, setPhase] = useState<Phase>("idle");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false);
  const total = order.priceSatang + order.feeSatang;
  const thumb = order.media.find((m) => m.kind === "LISTING")?.url;
  const sellerReady = !!order.seller;

  async function start() {
    setBusy(true);
    try {
      const res = await api<Intent>(`/api/orders/${order.id}/pay`, { method });
      setIntent(res);
      setPhase("waiting");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const delivered = useRef(false);
  async function deliverWebhook() {
    if (!intent?.simulatedWebhook || delivered.current) return;
    delivered.current = true;
    setPhase("confirming");
    try {
      const res = await fetch("/api/webhooks/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-waijai-signature": intent.simulatedWebhook.signature },
        body: intent.simulatedWebhook.body,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "ชำระเงินไม่สำเร็จ");
      setPhase("success");
      setTimeout(() => {
        toast("จ่ายเงินเข้าตัวกลางแล้ว ไว้ใจพักเงินไว้ให้");
        router.push(`/orders/${order.id}`);
        router.refresh();
      }, 1500);
    } catch (e) {
      delivered.current = false;
      setPhase("idle");
      toast((e as Error).message, "error");
    }
  }

  // จำลอง: gateway แจ้งผลอัตโนมัติหลังรอสักครู่
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(deliverWebhook, method === "promptpay" ? 4500 : 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <main className="pb-32">
      <TopBar title="จ่ายเงินเข้าตัวกลาง" />
      <Stagger className="space-y-4 px-5">
        <FadeUp>
          <section className="card p-5">
            <div className="flex gap-4">
              <Thumb src={thumb} size={84} icon="image" />
              <div className="min-w-0 pt-1">
                <p className="text-[18px] font-semibold">{order.title}</p>
                <p className="mt-0.5 text-[15px] text-muted">จาก {order.seller ? `@${order.seller.username}` : order.counterpartyHandle ?? "ผู้ขาย"}</p>
                {order.seller?.kycVerified && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-accent-dark">
                    <Check className="h-4 w-4" strokeWidth={2.6} /> ผู้ขายยืนยันตัวตนแล้ว
                  </p>
                )}
              </div>
            </div>
            <div className="my-4 h-px bg-line" />
            <dl className="space-y-3 text-[16px]">
              <Row label="ราคาสินค้า" value={formatTHB(order.priceSatang)} />
              <Row label="ค่าบริการตัวกลาง" value={formatTHB(order.feeSatang)} />
              <div className="flex items-center justify-between pt-1">
                <dt className="text-[18px] font-bold">ยอดที่ต้องจ่าย</dt>
                <dd className="tabular text-[22px] font-bold">{formatTHB(total)}</dd>
              </div>
            </dl>
          </section>
        </FadeUp>

        <FadeUp>
          <section className="flex gap-3.5 rounded-[16px] bg-accent-soft p-5">
            <Lock className="mt-0.5 h-6 w-6 shrink-0 text-accent-dark" strokeWidth={2} />
            <div>
              <p className="text-[16px] font-bold text-accent-dark">เงินถูกพักไว้กับไว้ใจ</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#2E3B36]">
                ผู้ขายจะได้เงินก็ต่อเมื่อคุณกดยืนยันว่าได้ของตรงปก ถ้าของไม่มาหรือไม่ตรงปก รับเงินคืนเต็มจำนวน
              </p>
            </div>
          </section>
        </FadeUp>

        {!sellerReady && (
          <FadeUp>
            <div className="flex gap-3 rounded-[16px] bg-warn-soft p-4 text-[15px] text-warn-text">
              <Hourglass className="h-5 w-5 shrink-0" /> รอผู้ขายกดรับรายการจากลิงก์ก่อน จึงจะจ่ายเงินได้
            </div>
          </FadeUp>
        )}

        <FadeUp>
          <h2 className="mb-3 mt-2 text-[16px] font-bold">ช่องทางชำระเงิน</h2>
          <div className="space-y-3" role="radiogroup">
            {METHODS.map((m) => {
              const active = method === m.value;
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMethod(m.value)}
                  className={clsx(
                    "relative flex w-full items-center justify-between rounded-[16px] border bg-surface px-5 py-4 text-left transition-colors",
                    active ? "border-transparent" : "border-line hover:border-field",
                  )}
                >
                  {active && <motion.span layoutId="pay-ring" className="absolute inset-0 rounded-[16px] border-[2.5px] border-accent" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                  <span>
                    <span className="block text-[17px] font-semibold text-ink">{m.title}</span>
                    <span className="mt-0.5 block text-[14px] text-muted">{m.sub}</span>
                  </span>
                  <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] transition-colors", active ? "border-accent bg-accent" : "border-[#C9C9C2]")}>
                    <motion.span animate={{ scale: active ? 1 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }} className="h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                </motion.button>
              );
            })}
          </div>
          {order.paymentDeadline && (
            <p className="mt-3 text-center text-[13px] text-muted">
              ชำระภายใน <Countdown to={order.paymentDeadline} className="tabular font-semibold" /> ไม่งั้นรายการจะถูกยกเลิก
            </p>
          )}
        </FadeUp>
      </Stagger>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-6 pt-6">
        <Button onClick={start} loading={busy} disabled={!sellerReady} className="text-[18px]">
          จ่าย {formatTHB(total)} เข้าตัวกลาง
        </Button>
      </div>

      <Sheet open={phase !== "idle"} onClose={() => phase === "waiting" && setPhase("idle")}>
        <AnimatePresence mode="wait">
          {phase === "waiting" && method === "promptpay" && intent && (
            <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="pb-2 text-center">
              <p className="text-[20px] font-bold">สแกนจ่ายด้วยพร้อมเพย์</p>
              <p className="mt-1 text-[15px] text-muted">ยอด {formatTHB(total)} · เข้าบัญชีพักเงินของไว้ใจ</p>
              <div className="relative mx-auto mt-5 w-[230px] overflow-hidden rounded-[18px] border border-line bg-white p-4">
                <FakeQR seed={intent.providerRef} />
                <span className="absolute inset-x-4 h-[3px] animate-scan rounded-full bg-accent/70 shadow-[0_0_14px_rgba(14,122,90,0.8)]" />
              </div>
              <p className="mt-4 flex items-center justify-center gap-2 text-[14px] text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังรอการชำระเงิน (โหมดจำลอง)
              </p>
              <div className="mt-4">
                <Button variant="secondary" onClick={deliverWebhook}>
                  จำลองว่าสแกนจ่ายแล้ว
                </Button>
              </div>
            </motion.div>
          )}
          {((phase === "waiting" && method !== "promptpay") || phase === "confirming") && (
            <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10 text-center">
              <div className="relative h-20 w-20">
                <motion.span className="absolute inset-0 rounded-full border-[5px] border-accent-soft" />
                <motion.span
                  className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-accent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <Lock className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-accent" />
              </div>
              <p className="mt-5 text-[18px] font-bold">
                {phase === "confirming" ? "กำลังยืนยันการชำระเงิน…" : method === "card" ? "กำลังตัดบัตร…" : "กำลังเปิดแอปธนาคาร…"}
              </p>
              <p className="mt-1 text-[14px] text-muted">อย่าปิดหน้านี้</p>
            </motion.div>
          )}
          {phase === "success" && (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-accent"
              >
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.4 }} />
                </svg>
              </motion.div>
              <p className="mt-5 text-[20px] font-bold">ชำระเงินสำเร็จ</p>
              <p className="mt-1 text-[15px] text-muted">ไว้ใจพักเงิน {formatTHB(total)} ไว้ให้แล้ว</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular text-ink">{value}</dd>
    </div>
  );
}

/** QR หน้าตาจริงจังสำหรับโหมดจำลอง (ไม่ใช่ QR ที่สแกนได้) */
function FakeQR({ seed }: { seed: string }) {
  const N = 25;
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const f = finder(x, y);
      if (f === 1 || (f === -1 && rand() > 0.52)) cells.push([x, y]);
    }
  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="h-auto w-full" shapeRendering="crispEdges">
      {cells.map(([x, y], i) => (
        <motion.rect key={i} x={x} y={y} width={1} height={1} fill="#141414" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (x + y) * 0.012 }} />
      ))}
    </svg>
  );
}
