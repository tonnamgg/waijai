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
  /** เช่น "Valorant" ถ้าเป็นรหัสเกม */
  gameName?: string | null;
  kind?: string;
};

export function OrderListItem({ row }: { row: OrderListRow }) {
  return (
    <motion.li variants={fadeUp} className="border-b border-line last:border-b-0">
      <Link href={`/orders/${row.id}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-soft/60 active:bg-soft">
        <Thumb src={row.thumb} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {row.gameName && <span className="mr-1.5 rounded-[6px] bg-ink px-1.5 py-[1px] text-[11px] font-semibold text-white">{row.gameName}</span>}
            {row.role === "SELLER" ? "ขายให้" : "ซื้อจาก"} {row.counterparty}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular text-[16px] font-bold text-ink">{formatTHB(row.priceSatang)}</span>
          <StatusPill status={row.status} role={row.role} kind={row.kind} />
        </div>
      </Link>
    </motion.li>
  );
}
