import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { orderInclude, toDTO } from "@/lib/orders";
import { TopBar } from "@/components/ui/TopBar";
import { AdminDisputes } from "./admin-disputes";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return (
      <main>
        <TopBar title="ข้อพิพาท" back="/account" />
        <div className="card mx-5 flex flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-warn" />
          <p className="text-[17px] font-bold">เฉพาะแอดมินเท่านั้น</p>
          <p className="text-[14px] text-muted">สลับเป็นผู้ใช้ @admin ที่หน้าบัญชีเพื่อทดสอบการตัดสินข้อพิพาท</p>
          <Link href="/account" className="font-semibold text-accent underline">
            ไปหน้าบัญชี
          </Link>
        </div>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    where: { dispute: { isNot: null } },
    include: orderInclude,
    orderBy: { updatedAt: "desc" },
  });
  const counts = await prisma.order.groupBy({ by: ["status"], _count: true });

  return (
    <main className="pb-10">
      <TopBar title="ข้อพิพาท (แอดมิน)" back="/account" />
      <AdminDisputes orders={orders.map(toDTO)} counts={Object.fromEntries(counts.map((c) => [c.status, c._count]))} />
    </main>
  );
}
