import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderForUser, toDTO, viewRole } from "@/lib/orders";
import { HttpError } from "@/lib/http";
import { DoneClient } from "./done-client";

export const dynamic = "force-dynamic";

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  if (order.status !== "RELEASED") redirect(`/orders/${id}`);
  return <DoneClient order={toDTO(order)} role={viewRole(order, user.id)} />;
}
