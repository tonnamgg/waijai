"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function CopyButton({ text, label = "คัดลอก" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
      className="relative h-11 min-w-[84px] overflow-hidden rounded-btn border border-field bg-surface px-4 text-[15px] text-ink transition-colors hover:bg-soft"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="ok" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="flex items-center justify-center gap-1 font-semibold text-accent">
            <Check className="h-4 w-4" strokeWidth={3} /> แล้ว
          </motion.span>
        ) : (
          <motion.span key="label" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="block">
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
