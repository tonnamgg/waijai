import { Pill } from "./ui/Pill";
import { statusLabel } from "@/lib/status";
import type { OrderStatus, Role } from "@/lib/types";

export function StatusPill({ status, role, kind, className }: { status: OrderStatus; role: Role | null; kind?: string; className?: string }) {
  const { text, tone } = statusLabel(status, role, kind);
  return (
    <Pill tone={tone} className={className}>
      {text}
    </Pill>
  );
}
