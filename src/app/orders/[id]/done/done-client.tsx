"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { StarRating } from "@/components/StarRating";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { formatTHB } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders";
import type { Role } from "@/lib/types";

const COLORS = ["#0E7A5A", "#E8A317", "#3BB58A", "#B4530A", "#7FD1B0", "#141414"];

function Confetti() {
  const [pieces, setPieces] = useState<{ x: number; y: number; r: number; c: string; s: number; d: number; round: boolean }[]>([]);
  useEffect(() => {
    setPieces(
      Array.from({ length: 42 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 42 + Math.random() * 0.4;
        const dist = 110 + Math.random() * 130;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          r: Math.random() * 540 - 270,
          c: COLORS[i % COLORS.length],
          s: 6 + Math.random() * 6,
          d: Math.random() * 0.15,
          round: i % 3 === 0,
        };
      }),
    );
  }, []);
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: p.s, height: p.round ? p.s : p.s * 0.45, background: p.c, borderRadius: p.round ? 999 : 2, left: -p.s / 2, top: -p.s / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 160], opacity: [1, 1, 0], rotate: p.r, scale: 1 }}
          transition={{ duration: 1.8, delay: 0.35 + p.d, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

export function DoneClient({ order: o, role }: { order: OrderDTO; role: Role | null }) {
  const toast = useToast();
  const isBuyer = role === "BUYER";
  const [stars, setStars] = useState(o.rating?.stars ?? 0);
  const [comment, setComment] = useState(o.rating?.comment ?? "");
  const [saved, setSaved] = useState(!!o.rating);
  const [busy, setBusy] = useState(false);
  const seller = o.seller ? `@${o.seller.username}` : "ผู้ขาย";

  async function rate(n: number) {
    setStars(n);
    setSaved(false);
  }

  async function saveRating() {
    setBusy(true);
    try {
      await api(`/api/orders/${o.id}/rating`, { stars, comment: comment || undefined });
      setSaved(true);
      toast("ขอบคุณสำหรับคะแนน!");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-14">
      <div className="relative mx-auto">
        <Confetti />
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 13 }}
          className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-accent shadow-[0_12px_32px_rgba(14,122,90,0.35)]"
        >
          <motion.span className="absolute inset-0 rounded-full border-4 border-accent" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 1.1, delay: 0.3 }} />
          <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.45, ease: "easeOut" }} />
          </svg>
        </motion.div>
      </div>

      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-7 text-center text-[30px] font-bold tracking-tight">
        {isBuyer ? "ปล่อยเงินให้ผู้ขายแล้ว" : "ได้รับเงินแล้ว"}
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-2 text-center text-[16px] leading-relaxed text-muted">
        โอน {formatTHB(o.priceSatang)} เข้าบัญชีของ {seller} เรียบร้อย
        <br />
        รายการนี้เสร็จสมบูรณ์
      </motion.p>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.45 }} className="card mt-7 p-5">
        <dl className="space-y-3.5 text-[16px]">
          <Row k="สินค้า" v={o.title} />
          <Row k="เลขรายการ" v={o.code} />
          <Row k="วันที่ปล่อยเงิน" v={o.releasedAt ? formatDateTime(o.releasedAt) : "-"} />
        </dl>
        <div className="my-4 h-px bg-line" />
        <dl className="space-y-3.5 text-[16px]">
          <Row k={isBuyer ? "คุณจ่าย" : "ผู้ซื้อจ่าย"} v={formatTHB(o.priceSatang + o.feeSatang)} />
          <div className="flex items-center justify-between">
            <dt className="font-bold">{isBuyer ? "ผู้ขายได้รับ" : "คุณได้รับ"}</dt>
            <dd className="tabular font-bold">{formatTHB(o.priceSatang)}</dd>
          </div>
        </dl>
      </motion.section>

      {isBuyer && (
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-7 text-center">
          <h2 className="text-[17px] font-bold">ให้คะแนนผู้ขาย</h2>
          <div className="mt-3">
            <StarRating value={stars} onChange={rate} />
          </div>
          <AnimatePresence mode="wait">
            {stars > 0 && !saved ? (
              <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-2.5 pt-4">
                  <input className="input" maxLength={300} placeholder="ความเห็นสั้น ๆ (ไม่บังคับ)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Button size="md" variant="dark" loading={busy} onClick={saveRating}>
                    ส่งคะแนน
                  </Button>
                </div>
              </motion.div>
            ) : saved ? (
              <motion.p key="thanks" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-accent">
                <Heart className="h-4 w-4 fill-accent" /> ขอบคุณที่ช่วยให้ชุมชนไว้ใจกันมากขึ้น
              </motion.p>
            ) : (
              <motion.p key="hint" className="mt-3 text-[14px] text-muted">
                คะแนนช่วยให้คนอื่นเลือกผู้ขายที่ไว้ใจได้
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>
      )}

      <div className="flex-1" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }} className="mt-8 space-y-2">
        <ButtonLink href="/">กลับหน้าหลัก</ButtonLink>
        <Link href={`/orders/${o.id}/receipt`} target="_blank" className="flex items-center justify-center gap-2 py-3 text-[16px] text-[#3E3E3A] hover:text-ink">
          <Download className="h-4 w-4" /> ดาวน์โหลดใบเสร็จ
        </Link>
      </motion.div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="truncate text-right text-ink">{v}</dd>
    </div>
  );
}
