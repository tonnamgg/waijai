"use client";

import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import clsx from "clsx";

export type Step = {
  key: string;
  title: string;
  sub: string;
  state: "done" | "current" | "todo" | "warn";
};

const ROW = 0.09;

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const lineActive = s.state === "done";
        return (
          <motion.li
            key={s.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * ROW, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* เส้นเชื่อม */}
            {!last && (
              <div className="absolute left-[19px] top-10 h-[calc(100%-36px)] w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full w-full origin-top bg-accent"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: lineActive ? 1 : 0 }}
                  transition={{ delay: 0.25 + i * ROW, duration: 0.45, ease: "easeOut" }}
                />
              </div>
            )}
            <Dot state={s.state} delay={0.15 + i * ROW} />
            <div className="min-w-0 flex-1 pt-1.5">
              <p className={clsx("text-[17px] font-semibold", s.state === "todo" ? "text-muted" : s.state === "warn" ? "text-warn-text" : "text-ink")}>
                {s.title}
              </p>
              <p className="mt-0.5 text-[14px] text-muted">{s.sub}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function Dot({ state, delay }: { state: Step["state"]; delay: number }) {
  return (
    <div className="relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center">
      {state === "current" && <span className="absolute inset-0 animate-ring rounded-full bg-accent/40" />}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay }}
        className={clsx(
          "relative flex h-[38px] w-[38px] items-center justify-center rounded-full",
          state === "done" && "bg-accent",
          state === "current" && "bg-accent",
          state === "todo" && "border-[3px] border-[#D3D3CD] bg-surface",
          state === "warn" && "bg-warn",
        )}
      >
        {state === "done" && (
          <motion.svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: delay + 0.15, duration: 0.35 }} />
          </motion.svg>
        )}
        {state === "current" && <span className="h-3.5 w-3.5 rounded-full bg-surface" />}
        {state === "warn" && <TriangleAlert className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />}
      </motion.div>
    </div>
  );
}
