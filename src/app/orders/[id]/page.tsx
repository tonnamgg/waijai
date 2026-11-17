import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hostLockedUsername, requireUser } from "@/lib/auth";
import { getOrderForUser, toDTO, viewRole } from "@/lib/orders";
import { HttpError } from "@/lib/http";
import { config } from "@/lib/config";
import { requireRoomAccess, roomSnapshot, touchPresence } from "@/lib/room-server";
import { OrderTracking } from "./order-tracking";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  const role = viewRole(order, user.id);
  // ผู้ใช้อีกฝ่าย (สำหรับปุ่มเปิดจอของอีกฝ่ายในโหมดทดสอบ)
  const otherId = role === "BUYER" ? order.sellerId : role === "SELLER" ? order.buyerId : null;
  const [other, access, locked] = await Promise.all([
    otherId ? prisma.user.findUnique({ where: { id: otherId }, select: { username: true } }) : null,
    requireRoomAccess(order.id, user),
    hostLockedUsername(),
    touchPresence(order.id, user.id, false),
  ]);
  const room = await roomSnapshot(access);

  return (
    <OrderTracking
      order={toDTO(order)}
      role={role}
      me={{ id: user.id, username: user.username, isAdmin: user.role === "admin" }}
      otherUsername={other?.username ?? null}
      deliveryMaxDays={config.DELIVERY_MAX_DAYS}
      devTools={process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_TOOLS === "1"}
      room={room}
      hostLocked={locked === user.username}
    />
  );
}
