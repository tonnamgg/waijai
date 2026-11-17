import { counterpartyName, type OrderDTO, type OrderFull, toDTO, viewRole } from "./orders";
import type { OrderListRow } from "@/components/OrderListItem";
import type { OrderStatus } from "./types";
import { gameById } from "./games";

export function toRow(o: OrderFull, userId: string): OrderListRow {
  const dto = toDTO(o);
  const role = viewRole(o, userId) ?? (o.creatorRole as "BUYER" | "SELLER");
  return {
    id: o.id,
    title: o.title,
    status: o.status as OrderStatus,
    role,
    counterparty: counterpartyName(dto, role),
    priceSatang: o.priceSatang,
    thumb: listingThumb(dto),
    kind: dto.kind,
    gameName: dto.kind === "GAME_ACCOUNT" ? gameById(dto.meta.game)?.name ?? "รหัสเกม" : null,
  };
}

export function listingThumb(o: Pick<OrderDTO, "media">): string | null {
  return o.media.find((m) => m.kind === "LISTING" && m.mime.startsWith("image/"))?.url ?? null;
}
