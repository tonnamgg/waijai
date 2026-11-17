import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DuoClient } from "./duo-client";

export const dynamic = "force-dynamic";

/** โหมดสองจอ: ผู้ซื้อ (ซ้าย) ↔ ผู้ขาย (ขวา) แต่ละจอล็อกเป็นคนละบัญชีผ่าน <username>.localhost */
export default async function DuoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_TOOLS !== "1") notFound();
  const sp = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { username: true, displayName: true, role: true } });
  return <DuoClient users={users} initial={{ buyer: sp.buyer || "mint", seller: sp.seller || "gadgetbkk", path: sp.path?.startsWith("/") ? sp.path : "/" }} />;
}
