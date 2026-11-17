"use client";

import { motion } from "framer-motion";
import { BadgeCheck, ChevronRight, Columns2, Gavel, Loader2, Star } from "lucide-react";
import { publicOrigin } from "@/lib/room";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { Stagger, FadeUp, CountUp } from "@/components/ui/motion";
import { formatTHB } from "@/lib/money";

type U = { username: string; displayName: string; role: string; kycVerified: boolean };

export function AccountClient({
  me,
  users,
  locked,
  devTools,
  stats,
  rules,
}: {
  me: U & { phone: string | null };
  users: U[];
  locked: boolean;
  devTools: boolean;
  stats: { buy: number; sell: number; receivedSatang: number; rating: number | null; ratingCount: number };
  rules: { pay: number; ship: number; inspect: number; delivery: number; feePercent: number; feeMin: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [switching, setSwitching] = useState<string | null>(null);

  async function switchTo(username: string) {
    if (username === me.username) return;
    setSwitching(username);
    try {
      await api("/api/auth/switch", { username });
      toast(`สลับเป็น @${username} แล้ว`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <Stagger className="space-y-5">
      <FadeUp>
        <h1 className="text-[24px] font-bold">บัญชี</h1>
      </FadeUp>

      <FadeUp>
        <section className="card flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-[22px] font-bold text-white">{me.displayName.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[20px] font-bold">
              {me.displayName} {me.kycVerified && <BadgeCheck className="h-5 w-5 text-accent" />}
            </p>
            <p className="text-[15px] text-muted">
              @{me.username}
              {me.phone ? ` · ${me.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}` : ""}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-accent-dark">{me.kycVerified ? "ยืนยันตัวตนแล้ว" : "ยังไม่ยืนยันตัวตน (KYC)"}</p>
          </div>
        </section>
      </FadeUp>

      <FadeUp>
        <section className="grid grid-cols-3 gap-2.5">
          <Stat label="ซื้อ" value={String(stats.buy)} />
          <Stat label="ขาย" value={String(stats.sell)} />
          <div className="rounded-[16px] bg-soft p-4">
            <p className="flex items-center gap-1 text-[20px] font-bold">
              {stats.rating ?? "-"} <Star className="h-4 w-4 fill-star text-star" />
            </p>
            <p className="text-[13px] text-muted">{stats.ratingCount} รีวิว</p>
          </div>
        </section>
      </FadeUp>

      <FadeUp>
        <section className="card p-5">
          <p className="text-[14px] text-muted">ยอดที่ได้รับจากการขาย</p>
          <CountUp satang={stats.receivedSatang} className="tabular mt-1 block text-[30px] font-bold" />
        </section>
      </FadeUp>

      {me.role === "admin" && (
        <FadeUp>
          <Link href="/admin/disputes" className="card flex items-center gap-3 p-5 transition-colors hover:bg-soft/60">
            <Gavel className="h-6 w-6 text-warn" />
            <span className="flex-1 text-[16px] font-semibold">จัดการข้อพิพาท (แอดมิน)</span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Link>
        </FadeUp>
      )}

      {devTools && (
        <FadeUp>
          <a
            href="/duo"
            onClick={(e) => {
              // ถ้าอยู่ในจอของโหมดสองจออยู่แล้ว ให้เปิดที่หน้าต่างบนสุด
              if (window.top && window.top !== window.self) {
                e.preventDefault();
                window.open(`${publicOrigin()}/duo`, "_blank", "noopener");
              } else {
                e.preventDefault();
                window.location.assign(`${publicOrigin()}/duo`);
              }
            }}
            className="card flex items-center gap-3 p-5 transition-colors hover:bg-soft/60"
          >
            <Columns2 className="h-6 w-6 text-accent" />
            <span className="flex-1">
              <span className="block text-[16px] font-semibold">โหมดสองจอ · ผู้ซื้อ ↔ ผู้ขาย</span>
              <span className="block text-[13px] text-muted">เปิดสองบัญชีข้างกันในหน้าเดียว ลองคุยและทำดีลได้จริง</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </a>
        </FadeUp>
      )}

      <FadeUp>
        <section>
          <h2 className="mb-1 text-[17px] font-bold">สลับผู้ใช้ (โหมดทดสอบ)</h2>
          {locked ? (
            <p className="mb-3 rounded-btn bg-accent-soft px-4 py-3 text-[14px] text-accent-dark">
              หน้าต่างนี้ล็อกเป็น <b>@{me.username}</b> จากที่อยู่เว็บ ({me.username}.localhost) — เปิดบัญชีอื่นได้ที่โหมดสองจอ
            </p>
          ) : (
            <p className="mb-3 text-[14px] text-muted">ระบบล็อกอินจริงยังไม่เปิด — สลับบัญชีเพื่อทดสอบเป็นผู้ซื้อ ผู้ขาย หรือแอดมิน</p>
          )}
          <ul className={clsx("card overflow-hidden", locked && "pointer-events-none opacity-50")}>
            {users.map((u) => {
              const active = u.username === me.username;
              return (
                <li key={u.username} className="border-b border-line last:border-b-0">
                  <button onClick={() => switchTo(u.username)} className="relative flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-soft/60">
                    {active && <motion.span layoutId="active-user" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" />}
                    <span className={clsx("flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold", active ? "bg-accent text-white" : "bg-soft text-ink")}>
                      {u.displayName.slice(0, 1)}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[16px] font-semibold">{u.displayName}</span>
                      <span className="block text-[13px] text-muted">
                        @{u.username}
                        {u.role === "admin" ? " · แอดมิน" : ""}
                      </span>
                    </span>
                    {switching === u.username ? (
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    ) : active ? (
                      <span className="text-[13px] font-semibold text-accent">กำลังใช้งาน</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </FadeUp>

      <FadeUp>
        <section className="rounded-[16px] bg-soft p-5 text-[14px] leading-relaxed text-[#3E3E3A]">
          <p className="mb-2 font-bold text-ink">กติกาของไว้ใจ</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>ผู้ซื้อต้องจ่ายภายใน {rules.pay} ชม. หลังสร้างรายการ</li>
            <li>ผู้ขายต้องส่งของภายใน {rules.ship / 24} วัน ไม่งั้นคืนเงินอัตโนมัติ</li>
            <li>ผู้ซื้อตรวจของภายใน {rules.inspect} ชม. ไม่กดอะไร = ปล่อยเงินอัตโนมัติ</li>
            <li>ส่งแล้วของไม่ถึงใน {rules.delivery} วัน แจ้งข้อพิพาท &ldquo;ของไม่มา&rdquo; ได้</li>
            <li>ค่าบริการ {rules.feePercent}% (ขั้นต่ำ {formatTHB(rules.feeMin)}) ผู้ซื้อเป็นผู้จ่าย</li>
          </ul>
        </section>
      </FadeUp>
    </Stagger>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-soft p-4">
      <p className="text-[20px] font-bold">{value}</p>
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}
