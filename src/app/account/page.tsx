import { prisma } from "@/lib/db";
import { hostLockedUsername, requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { BottomNav } from "@/components/BottomNav";
import { AccountClient } from "./account-client";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const locked = (await hostLockedUsername()) === user.username;
  const [users, buyCount, sellCount, received, ratings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { username: true, displayName: true, role: true, kycVerified: true } }),
    prisma.order.count({ where: { buyerId: user.id } }),
    prisma.order.count({ where: { sellerId: user.id } }),
    prisma.order.aggregate({ where: { sellerId: user.id, status: "RELEASED" }, _sum: { priceSatang: true } }),
    prisma.rating.aggregate({ where: { order: { sellerId: user.id } }, _avg: { stars: true }, _count: true }),
  ]);

  return (
    <main className="px-5 pt-6">
      <AccountClient
        me={{ username: user.username, displayName: user.displayName, role: user.role, kycVerified: user.kycVerified, phone: user.phone }}
        users={users}
        locked={locked}
        devTools={process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_TOOLS === "1"}
        stats={{
          buy: buyCount,
          sell: sellCount,
          receivedSatang: received._sum.priceSatang ?? 0,
          rating: ratings._avg.stars ? Math.round(ratings._avg.stars * 10) / 10 : null,
          ratingCount: ratings._count,
        }}
        rules={{
          pay: config.PAYMENT_DEADLINE_HOURS,
          ship: config.SHIP_DEADLINE_HOURS,
          inspect: config.INSPECT_WINDOW_HOURS,
          delivery: config.DELIVERY_MAX_DAYS,
          feePercent: config.FEE_PERCENT,
          feeMin: config.FEE_MIN_SATANG,
        }}
      />
      <BottomNav />
    </main>
  );
}
