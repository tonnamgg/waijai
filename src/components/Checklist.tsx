"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

export function Checklist({
  items,
  checked,
  onToggle,
}: {
  items: string[];
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  const done = checked.filter(Boolean).length;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-ink">เช็กตามที่ตกลงกัน</h2>
        <span className="tabular text-[15px] text-muted">
          ตรวจแล้ว{" "}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={done}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className={clsx("inline-block font-semibold", done === items.length && items.length > 0 ? "text-accent" : "text-muted")}
            >
              {done}
            </motion.span>
          </AnimatePresence>
          /{items.length}
        </span>
      </div>
      <div className="card overflow-hidden">
        {items.length === 0 && <p className="px-5 py-4 text-[15px] text-muted">ไม่มีเช็กลิสต์สำหรับรายการนี้</p>}
        {items.map((label, i) => (
          <motion.button
            type="button"
            key={i}
            onClick={() => onToggle(i)}
            whileTap={{ scale: 0.985 }}
            aria-pressed={checked[i]}
            className="flex w-full items-center gap-4 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-soft/50"
          >
            <CheckBox on={checked[i]} />
            <span className={clsx("text-[16px] transition-colors", checked[i] ? "text-ink" : "text-ink")}>{label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

export function CheckBox({ on }: { on: boolean }) {
  return (
    <motion.span
      animate={{ backgroundColor: on ? "#0E7A5A" : "#FFFFFF", borderColor: on ? "#0E7A5A" : "#D3D3CD", scale: on ? [1, 1.15, 1] : 1 }}
      transition={{ duration: 0.25 }}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border-[2.5px]"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.25, delay: on ? 0.05 : 0 }} />
      </svg>
    </motion.span>
  );
}
