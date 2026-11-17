"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StatusPill } from "./StatusPill";
import { Thumb } from "./ui/Thumb";
import { formatTHB } from "@/lib/money";
import type { OrderStatus, Role } from "@/lib/types";
import { fadeUp } from "./ui/motion";

export type OrderListRow = {
  id: string;
  title: string;
  status: OrderStatus;
  role: Role | null;
  counterparty: string;
  priceSatang: number;
  thumb: string | null;
};

export function OrderListItem({ row }: { row: OrderListRow }) {
  return (
    <motion.li variants={fadeUp} className="border-b border-line last:border-b-0">
      <Link href={`/orders/${row.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-soft/60 active:bg-soft">
        <motion.div whileHover={{ rotate: -4, scale: 1.04 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
          <Thumb src={row.thumb} size={60} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 truncate text-[14px] text-muted">
            {row.role === "SELLER" ? "ขายให้" : "ซื้อจาก"} {row.counterparty}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="tabular text-[18px] font-bold text-ink">{formatTHB(row.priceSatang)}</span>
          <StatusPill status={row.status} role={row.role} />
        </div>
      </Link>
    </motion.li>
  );
}
