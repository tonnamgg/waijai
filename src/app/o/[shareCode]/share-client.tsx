"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Check, CircleSlash, Clock, Handshake, KeyRound, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Thumb } from "@/components/ui/Thumb";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { Stagger, FadeUp } from "@/components/ui/motion";
import { Avatar } from "@/components/room/RoomParts";
import { GameInfo } from "@/components/game/GameParts";
import type { GameMeta } from "@/lib/games";
import { formatTHB } from "@/lib/money";

type Data = {
  title: string;
  status: string;
  priceSatang: number;
  feeSatang: number;
  totalSatang: number;
  creatorRole: "BUYER" | "SELLER";
  creator: { username: string; displayName: string; kycVerified: boolean } | null;
  counterpartyHandle: string | null;
  checklist: string[];
  photos: string[];
  shipDays: number;
  inspectHours: number;
  deliverHours: number;
  kind: "PHYSICAL" | "GAME_ACCOUNT";
  meta: GameMeta;
};

export function ShareClient({ shareCode, me, data: d }: { shareCode: string; me: string; data: Data }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const iAmBuyer = d.creatorRole === "SELLER";
  const isMine = d.creator?.username === me;
  const open = d.status === "CREATED";

  async function accept() {
    setBusy(true);
    try {
      const res = await api<{ id: string; role?: string }>(`/api/o/${shareCode}/accept`);
      toast("เข้าห้องดีลแล้ว · อีกฝ่ายจะเห็นคุณทันที");
      router.push(`/orders/${res.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-40 pt-8">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-accent">
        <ShieldCheck className="h-7 w-7 text-white" />
      </motion.div>
      <h1 className="mt-4 text-center text-[24px] font-bold">
        {d.creator ? `@${d.creator.username}` : "มีคน"}ชวนคุณ{iAmBuyer ? "ซื้อ" : "ขาย"}ผ่านไว้ใจ
      </h1>
      <p className="mt-1 text-center text-[15px] text-muted">เงินจะถูกพักไว้กับตัวกลาง จนกว่าผู้ซื้อจะได้ของตรงปก</p>

      <Stagger className="mt-6 space-y-4">
        <FadeUp>
          <section className="card p-5">
            <div className="flex gap-4">
              <Thumb src={d.photos[0]} size={80} icon="image" />
              <div className="min-w-0 pt-1">
                <p className="text-[18px] font-semibold">{d.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[14px] text-muted">
                  {iAmBuyer ? "ผู้ขาย" : "ผู้ซื้อ"} @{d.creator?.username}
                  {d.creator?.kycVerified && <BadgeCheck className="h-4 w-4 text-accent" />}
                </p>
                <p className="tabular mt-1 text-[20px] font-bold">{formatTHB(d.priceSatang)}</p>
              </div>
            </div>
            {d.kind === "GAME_ACCOUNT" && <GameInfo meta={d.meta} className="mt-4 rounded-btn bg-soft p-3" />}
            {d.photos.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {d.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p} src={p} alt="" className="aspect-square rounded-btn object-cover" />
                ))}
              </div>
            )}
            {iAmBuyer && (
              <div className="mt-4 space-y-1.5 rounded-btn bg-soft p-4 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-muted">ค่าบริการตัวกลาง</span>
                  <span className="tabular">{formatTHB(d.feeSatang)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>ยอดที่คุณต้องจ่าย</span>
                  <span className="tabular">{formatTHB(d.totalSatang)}</span>
                </div>
              </div>
            )}
          </section>
        </FadeUp>

        {open && !isMine && (
          <FadeUp>
            <section className="card p-5">
              <div className="flex items-center justify-center gap-3">
                <Avatar name={me} role={iAmBuyer ? "BUYER" : "SELLER"} size={44} />
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-[2px] w-6 rounded-full bg-line" />
                  <ShieldCheck className="h-5 w-5 text-accent" />
                  <span className="h-[2px] w-6 rounded-full bg-line" />
                </span>
                <Avatar name={d.creator?.displayName ?? "?"} role={iAmBuyer ? "SELLER" : "BUYER"} size={44} />
              </div>
              <p className="mt-3 text-center text-[15px] font-bold">กดรับแล้วเข้าห้องดีลเดียวกับ @{d.creator?.username}</p>
              <ul className="mt-2 space-y-1.5 text-[14px] text-[#3E3E3A]">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} /> แชทกันได้ในห้อง เห็นว่าอีกฝ่ายออนไลน์อยู่ไหม
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} /> บอกชัดว่าตอนนี้ถึงตาใคร ต้องทำอะไร
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} />
                  {iAmBuyer ? "จ่ายเงินในห้อง ไว้ใจพักไว้จนกว่าคุณจะได้ของตรงปก" : "ผู้ซื้อจ่ายเข้าตัวกลางก่อน คุณค่อยส่งของ"}
                </li>
              </ul>
            </section>
          </FadeUp>
        )}

        {d.checklist.length > 0 && (
          <FadeUp>
            <section className="card p-5">
              <p className="mb-3 text-[15px] font-bold">รายละเอียดที่ต้องตรงปก</p>
              <ul className="space-y-2">
                {d.checklist.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[15px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} /> {c}
                  </li>
                ))}
              </ul>
            </section>
          </FadeUp>
        )}

        <FadeUp>
          <div className="space-y-3 rounded-[16px] bg-soft px-5 py-4 text-[15px] text-[#3E3E3A]">
            <p className="flex items-center gap-3">
              {d.kind === "GAME_ACCOUNT" ? (
                <>
                  <KeyRound className="h-5 w-5 shrink-0 text-accent" /> ผู้ขายส่งไอดี/รหัสในห้องดีลภายใน {d.deliverHours} ชม. ไม่ส่ง = คืนเงินอัตโนมัติ
                </>
              ) : (
                <>
                  <Truck className="h-5 w-5 shrink-0 text-accent" /> ผู้ขายต้องส่งภายใน {d.shipDays} วัน ไม่ส่ง = คืนเงินอัตโนมัติ
                </>
              )}
            </p>
            <p className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-accent" />
              {d.kind === "GAME_ACCOUNT"
                ? `คุณล็อกอินตรวจ + เปลี่ยนรหัสผ่านได้ภายใน ${d.inspectHours} ชม. ก่อนเงินถึงผู้ขาย`
                : `ผู้ซื้อตรวจของภายใน ${d.inspectHours} ชม. หลังของถึง`}
            </p>
          </div>
        </FadeUp>

        <FadeUp>
          <p className="text-center text-[13px] text-muted">
            คุณกำลังใช้งานในชื่อ <b>@{me}</b> ·{" "}
            <Link href="/account" className="text-accent underline">
              สลับผู้ใช้
            </Link>
          </p>
        </FadeUp>
      </Stagger>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-6 pt-8">
        {!open ? (
          <div className="flex items-center justify-center gap-2 rounded-btn bg-soft py-4 text-[15px] text-muted">
            <CircleSlash className="h-5 w-5" /> รายการนี้ไม่เปิดรับแล้ว
          </div>
        ) : isMine ? (
          <ButtonLink href="/" variant="secondary">
            นี่คือรายการของคุณ · ส่งลิงก์ให้อีกฝ่าย
          </ButtonLink>
        ) : (
          <Button onClick={accept} loading={busy} icon={<Handshake className="h-5 w-5" />}>
            รับรายการ · เข้าห้องดีลกับ @{d.creator?.username}
          </Button>
        )}
      </div>
    </main>
  );
}
