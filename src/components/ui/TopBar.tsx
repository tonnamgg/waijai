"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function TopBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-2 bg-bg/90 px-3 backdrop-blur-md">
      <motion.button
        whileTap={{ scale: 0.88 }}
        aria-label="ย้อนกลับ"
        onClick={() => (back ? router.push(back) : window.history.length > 1 ? router.back() : router.push("/"))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-soft"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
      </motion.button>
      <h1 className="flex-1 truncate text-[22px] font-bold tracking-tight text-ink">{title}</h1>
      {right}
    </header>
  );
}
