import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { orderInclude } from "@/lib/orders";
import { ACTIVE_STATUSES } from "@/lib/types";
import { toRow } from "@/lib/views";
import { BalanceCard } from "@/components/BalanceCard";
import { BottomNav } from "@/components/BottomNav";
import { ButtonLink } from "@/components/ui/Button";
import { HomeHeader, HowItWorks, RecentOrders } from "./home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const mine = { OR: [{ buyerId: user.id }, { sellerId: user.id }, { createdById: user.id }] };

  const [recent, active, unread] = await Promise.all([
    prisma.order.findMany({ where: mine, include: orderInclude, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.order.findMany({
      where: { status: { in: ACTIVE_STATUSES }, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      select: { priceSatang: true },
    }),
    prisma.orderEvent.count({
      where: {
        order: mine,
        actor: { not: user.id },
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    }),
  ]);

  const total = active.reduce((s, o) => s + o.priceSatang, 0);

  return (
    <main className="px-5 pt-6">
      <HomeHeader name={user.displayName} hasUnread={unread > 0} />
      <div className="mt-6">
        <BalanceCard totalSatang={total} count={active.length} />
      </div>
      <div className="mt-4">
        <ButtonLink href="/orders/new" icon={<Plus className="h-6 w-6" strokeWidth={2.2} />} className="h-[60px] text-[19px] hover:shadow-lift">
          สร้างรายการซื้อขาย
        </ButtonLink>
      </div>
      <HowItWorks />
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-ink">รายการล่าสุด</h2>
          <Link href="/orders" className="text-[16px] text-accent hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        <RecentOrders rows={recent.map((o) => toRow(o, user.id))} />
      </section>
      <BottomNav />
    </main>
  );
}
