import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { calcTotal } from "@/lib/money";
import { config } from "@/lib/config";
import { ShareClient } from "./share-client";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params;
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { shareCode },
    include: { media: { where: { kind: "LISTING" }, take: 4 }, buyer: true, seller: true },
  });
  if (!order) notFound();
  if (order.buyerId === user.id || order.sellerId === user.id) redirect(`/orders/${order.id}`);

  const creator = order.creatorRole === "SELLER" ? order.seller : order.buyer;
  const { fee, total } = calcTotal(order.priceSatang);

  return (
    <ShareClient
      shareCode={shareCode}
      me={user.username}
      data={{
        title: order.title,
        status: order.status,
        priceSatang: order.priceSatang,
        feeSatang: fee,
        totalSatang: total,
        creatorRole: order.creatorRole as "BUYER" | "SELLER",
        creator: creator ? { username: creator.username, displayName: creator.displayName, kycVerified: creator.kycVerified } : null,
        counterpartyHandle: order.counterpartyHandle,
        checklist: JSON.parse(order.checklistItems) as string[],
        photos: order.media.map((m) => m.url),
        shipDays: config.SHIP_DEADLINE_HOURS / 24,
        inspectHours: config.INSPECT_WINDOW_HOURS,
      }}
    />
  );
}
