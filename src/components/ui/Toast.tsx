"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };

const Ctx = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex w-full max-w-[430px] flex-col items-center gap-2 px-5">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              role="status"
              className="pointer-events-auto flex w-full items-start gap-2.5 rounded-btn bg-ink px-4 py-3 text-[15px] text-white shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
            >
              {t.kind === "success" && <CircleCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#6EE7B7]" />}
              {t.kind === "error" && <CircleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FCA5A5]" />}
              {t.kind === "info" && <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#93C5FD]" />}
              <span className="leading-snug">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
