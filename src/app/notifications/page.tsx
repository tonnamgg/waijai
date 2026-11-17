import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { TopBar } from "@/components/ui/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { NotificationList } from "./notification-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const events = await prisma.orderEvent.findMany({
    where: { order: { OR: [{ buyerId: user.id }, { sellerId: user.id }, { createdById: user.id }] } },
    include: { order: { select: { id: true, title: true, buyerId: true, sellerId: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return (
    <main>
      <TopBar title="การแจ้งเตือน" back="/" />
      <div className="px-5">
        <NotificationList
          items={events.map((e) => ({
            id: e.id,
            orderId: e.order.id,
            title: e.order.title,
            to: e.to,
            note: e.note ?? "",
            mine: e.actor === user.id,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      </div>
      <BottomNav />
    </main>
  );
}
