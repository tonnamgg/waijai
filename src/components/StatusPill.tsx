import { Pill } from "./ui/Pill";
import { statusLabel } from "@/lib/status";
import type { OrderStatus, Role } from "@/lib/types";

export function StatusPill({ status, role, className }: { status: OrderStatus; role: Role | null; className?: string }) {
  const { text, tone } = statusLabel(status, role);
  return (
    <Pill tone={tone} className={className}>
      {text}
    </Pill>
  );
}
