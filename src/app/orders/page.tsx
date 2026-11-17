import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { orderInclude } from "@/lib/orders";
import { toRow } from "@/lib/views";
import { BottomNav } from "@/components/BottomNav";
import { OrdersList } from "./orders-list";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }, { createdById: user.id }] },
    include: orderInclude,
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="px-5 pt-6">
      <h1 className="text-[24px] font-bold text-ink">รายการ</h1>
      <OrdersList rows={orders.map((o) => toRow(o, user.id))} />
      <BottomNav />
    </main>
  );
}
