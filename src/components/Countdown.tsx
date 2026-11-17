"use client";

import { useEffect, useState } from "react";
import { formatRemaining, splitRemaining } from "@/lib/format";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** ข้อความนับถอยหลัง เช่น "47 ชม. 12 นาที" */
export function Countdown({ to, className, onExpire }: { to: string | Date; className?: string; onExpire?: () => void }) {
  const now = useNow();
  const ms = new Date(to).getTime() - now;
  const expired = ms <= 0;
  useEffect(() => {
    if (expired) onExpire?.();
  }, [expired, onExpire]);
  return (
    <span className={className} suppressHydrationWarning>
      {formatRemaining(ms)}
    </span>
  );
}

/** "เหลือ 47 ชม. 12 นาที" แบบตัวหนา (ใช้ในแถบ amber) */
export function CountdownHM({ to }: { to: string | Date }) {
  const now = useNow();
  const r = splitRemaining(new Date(to).getTime() - now);
  if (r.expired) return <b suppressHydrationWarning>หมดเวลาแล้ว</b>;
  return (
    <b className="tabular" suppressHydrationWarning>
      เหลือ {r.totalHours} ชม. {r.minutes} นาที
    </b>
  );
}
