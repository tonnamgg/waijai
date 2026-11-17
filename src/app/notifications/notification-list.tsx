"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Bell, CircleSlash, Lock, PackageCheck, Scale, Truck, Undo2, FilePlus2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { staggerParent, fadeUp } from "@/components/ui/motion";
import { relativeTime } from "@/lib/format";

type Item = { id: string; orderId: string; title: string; to: string; note: string; mine: boolean; createdAt: string };

const ICON: Record<string, { icon: typeof Bell; cls: string }> = {
  CREATED: { icon: FilePlus2, cls: "bg-soft text-ink" },
  PAID_HELD: { icon: Lock, cls: "bg-accent-soft text-accent-dark" },
  SHIPPED: { icon: Truck, cls: "bg-soft text-ink" },
  DELIVERED: { icon: PackageCheck, cls: "bg-accent-soft text-accent-dark" },
  DISPUTED: { icon: Scale, cls: "bg-warn-soft text-warn-text" },
  RELEASED: { icon: BadgeCheck, cls: "bg-accent text-white" },
  REFUNDED: { icon: Undo2, cls: "bg-soft text-muted" },
  CANCELLED: { icon: CircleSlash, cls: "bg-soft text-muted" },
};

export function NotificationList({ items }: { items: Item[] }) {
  if (items.length === 0)
    return (
      <div className="card mt-2 flex flex-col items-center gap-2 py-12 text-center">
        <Bell className="h-10 w-10 text-muted" strokeWidth={1.5} />
        <p className="font-semibold">ยังไม่มีการแจ้งเตือน</p>
      </div>
    );
  return (
    <motion.ul variants={staggerParent} initial="hidden" animate="show" className="card overflow-hidden">
      {items.map((n) => {
        const { icon: Icon, cls } = ICON[n.to] ?? ICON.CREATED;
        return (
          <motion.li key={n.id} variants={fadeUp} className="border-b border-line last:border-b-0">
            <Link href={`/orders/${n.orderId}`} className="flex gap-3 px-5 py-4 transition-colors hover:bg-soft/60">
              <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", cls)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{n.title}</span>
                <span className="block text-[14px] text-muted">{n.note}{n.mine ? " (คุณ)" : ""}</span>
              </span>
              <span className="shrink-0 text-[12px] text-muted" suppressHydrationWarning>
                {relativeTime(n.createdAt)}
              </span>
            </Link>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
