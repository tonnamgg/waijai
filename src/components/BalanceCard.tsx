"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { CountUp } from "./ui/motion";

export function BalanceCard({ totalSatang, count }: { totalSatang: number; count: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="card relative overflow-hidden p-6 shadow-card"
    >
      {/* แสงวิ่งผ่านเบา ๆ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-accent/[0.05] to-transparent" />
      </div>
      <div className="flex items-center gap-2 text-[16px] text-muted">
        <motion.span
          initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 }}
        >
          <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
        </motion.span>
        เงินที่ไว้ใจพักไว้ให้
      </div>
      <CountUp satang={totalSatang} className="tabular mt-2 block text-[44px] font-bold leading-tight tracking-tight text-ink" />
      <p className="mt-2 text-[15px] text-muted">
        {count > 0 ? `จาก ${count} รายการที่ยังไม่เสร็จ · ปลอดภัยจนกว่าจะได้ของ` : "ยังไม่มีเงินพักอยู่ · สร้างรายการแรกได้เลย"}
      </p>
    </motion.section>
  );
}
