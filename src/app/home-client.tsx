"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { extractShareCode } from "@/lib/room";
import { OrderListItem, type OrderListRow } from "@/components/OrderListItem";
import { staggerParent } from "@/components/ui/motion";

/** หัวหน้าหลัก: ชื่อผู้ใช้เป็นหลัก (ไม่ใช่ชื่อแอป) */
export function HomeHeader({ name, username, hasUnread }: { name: string; username: string; hasUnread: boolean }) {
  return (
    <header className="flex items-center justify-between">
      <Link href="/account" className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[17px] font-bold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] leading-tight text-muted">สวัสดี</span>
          <span className="block truncate text-[22px] font-bold leading-tight text-ink">{name}</span>
        </span>
      </Link>
      <Link
        href="/notifications"
        aria-label={hasUnread ? "การแจ้งเตือน (มีรายการใหม่)" : "การแจ้งเตือน"}
        title={`@${username}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-soft"
      >
        <Bell className="h-6 w-6 text-ink" strokeWidth={1.8} />
        {hasUnread && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warn ring-2 ring-bg" />}
      </Link>
    </header>
  );
}

/** วางลิงก์ที่ได้จากอีกฝ่าย → เข้าหน้าเชิญ → กดรับ → เข้าห้องดีล */
export function JoinByLink() {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [going, setGoing] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const code = extractShareCode(value);
    if (!code) return toast("ลิงก์ไม่ถูกต้อง — วางลิงก์แบบ .../o/xxxx ที่อีกฝ่ายส่งมา", "error");
    setGoing(true);
    router.push(`/o/${code}`);
  }

  return (
    <form onSubmit={go} className="mt-3 flex items-center gap-2 rounded-btn border border-field bg-surface p-1.5 pl-4 focus-within:border-accent">
      <input
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8A8A84]"
        placeholder="จะซื้อของ? วางลิงก์จากผู้ขายที่นี่"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="ลิงก์รายการจากอีกฝ่าย"
      />
      <button
        type="submit"
        disabled={!value.trim() || going}
        aria-label="เข้าห้องดีล"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white transition-opacity disabled:opacity-25"
      >
        {going ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

export function RecentOrders({ rows }: { rows: OrderListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-field px-6 py-10 text-center">
        <p className="text-[15px] font-semibold">ยังไม่มีรายการ</p>
        <p className="mt-1 text-[14px] text-muted">ขายของ: กดลงขาย · ซื้อของ: วางลิงก์จากผู้ขาย</p>
      </div>
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
