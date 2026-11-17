import clsx from "clsx";
import type { Tone } from "@/lib/status";

const tones: Record<Tone, string> = {
  amber: "bg-warn-soft text-warn-text",
  neutral: "bg-soft text-ink",
  accent: "bg-accent-soft text-accent-dark",
  muted: "bg-soft text-muted",
  danger: "bg-[#FDECEC] text-[#9B1C1C]",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-pill px-3 text-[13px] font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
