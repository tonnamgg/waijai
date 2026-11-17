"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { OrderListItem, type OrderListRow } from "@/components/OrderListItem";
import { staggerParent } from "@/components/ui/motion";
import { FINAL_STATUSES } from "@/lib/types";

const TABS = [
  { key: "open", label: "กำลังดำเนินการ" },
  { key: "buy", label: "ซื้อ" },
  { key: "sell", label: "ขาย" },
  { key: "done", label: "จบแล้ว" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function OrdersList({ rows }: { rows: OrderListRow[] }) {
  const [tab, setTab] = useState<TabKey>("open");
  const filtered = useMemo(() => {
    switch (tab) {
      case "open":
        return rows.filter((r) => !FINAL_STATUSES.includes(r.status));
      case "buy":
        return rows.filter((r) => r.role === "BUYER");
      case "sell":
        return rows.filter((r) => r.role === "SELLER");
      case "done":
        return rows.filter((r) => FINAL_STATUSES.includes(r.status));
    }
  }, [rows, tab]);

  return (
    <>
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx("relative h-10 shrink-0 rounded-pill px-4 text-[15px] font-semibold transition-colors", active ? "text-white" : "bg-soft text-muted hover:text-ink")}
            >
              {active && <motion.span layoutId="orders-tab" className="absolute inset-0 rounded-pill bg-accent" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key={`empty-${tab}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <PackageOpen className="h-10 w-10 text-muted" strokeWidth={1.5} />
              <p className="text-[16px] font-semibold">ไม่มีรายการในหมวดนี้</p>
            </motion.div>
          ) : (
            <motion.ul key={tab} variants={staggerParent} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.12 } }} className="card overflow-hidden">
              {filtered.map((r) => (
                <OrderListItem key={r.id} row={r} />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
