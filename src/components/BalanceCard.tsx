"use client";

import { Lock } from "lucide-react";
import { CountUp } from "./ui/motion";

export function BalanceCard({ totalSatang, count }: { totalSatang: number; count: number }) {
  return (
    <section className="rounded-card bg-soft p-5">
      <p className="flex items-center gap-1.5 text-[14px] text-muted">
        <Lock className="h-4 w-4" strokeWidth={2} /> เงินที่พักไว้กับตัวกลาง
      </p>
      <CountUp satang={totalSatang} className="tabular mt-1 block text-[34px] font-bold leading-tight tracking-tight text-ink" />
      <p className="mt-1 text-[13px] text-muted">{count > 0 ? `${count} รายการที่ยังไม่เสร็จ` : "ยังไม่มีเงินพักอยู่"}</p>
    </section>
  );
}
