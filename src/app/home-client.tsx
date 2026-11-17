"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, PackageOpen, ShieldCheck } from "lucide-react";
import { OrderListItem, type OrderListRow } from "@/components/OrderListItem";
import { staggerParent } from "@/components/ui/motion";

export function HomeHeader({ name, hasUnread }: { name: string; hasUnread: boolean }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        <motion.div
          initial={{ scale: 0.5, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-accent shadow-[0_6px_16px_rgba(14,122,90,0.3)]"
        >
          <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2} />
        </motion.div>
        <div>
          <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-[16px] leading-tight text-muted">
            สวัสดี {name}
          </motion.p>
          <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }} className="text-[28px] font-bold leading-tight text-ink">
            ไว้ใจ
          </motion.p>
        </div>
      </div>
      <Link href="/notifications" aria-label="การแจ้งเตือน">
        <motion.div
          whileTap={{ scale: 0.9 }}
          whileHover={{ rotate: [0, -14, 12, -8, 0] }}
          transition={{ duration: 0.5 }}
          className="relative flex h-[58px] w-[58px] items-center justify-center rounded-[18px] border border-line bg-surface"
        >
          <Bell className="h-[26px] w-[26px] text-ink" strokeWidth={1.9} />
          {hasUnread && (
            <span className="absolute right-[15px] top-[14px] flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn ring-2 ring-white" />
            </span>
          )}
        </motion.div>
      </Link>
    </header>
  );
}

const STEPS = ["ผู้ซื้อจ่ายเงินเข้าตัวกลาง", "ได้ของแล้ว ตรวจว่าตรงปก", "ระบบโอนเงินให้ผู้ขาย"];

export function HowItWorks() {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className="mt-4 grid grid-cols-3 gap-2.5">
      {STEPS.map((t, i) => (
        <motion.div
          key={t}
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.08 } } }}
          whileHover={{ y: -3 }}
          className="rounded-[16px] bg-soft p-4"
        >
          <p className="text-[17px] font-bold text-accent">{i + 1}</p>
          <p className="mt-1.5 text-[15px] leading-snug text-[#3E3E3A]">{t}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function RecentOrders({ rows }: { rows: OrderListRow[] }) {
  if (rows.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
        <PackageOpen className="h-10 w-10 text-muted" strokeWidth={1.5} />
        <p className="text-[16px] font-semibold">ยังไม่มีรายการ</p>
        <p className="text-[14px] text-muted">กด &ldquo;สร้างรายการซื้อขาย&rdquo; เพื่อเริ่มซื้อขายอย่างปลอดภัย</p>
      </motion.div>
    );
  }
  return (
    <motion.ul variants={staggerParent} initial="hidden" animate="show" className="card overflow-hidden">
      {rows.map((r) => (
        <OrderListItem key={r.id} row={r} />
      ))}
    </motion.ul>
  );
}
