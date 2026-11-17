import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderForUser, toDTO } from "@/lib/orders";
import { HttpError } from "@/lib/http";
import { InspectClient } from "./inspect-client";

export const dynamic = "force-dynamic";

export default async function InspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  if (order.buyerId !== user.id) redirect(`/orders/${id}`);
  if (order.status === "RELEASED") redirect(`/orders/${id}/done`);
  if (order.status !== "DELIVERED") redirect(`/orders/${id}`);
  return <InspectClient order={toDTO(order)} />;
}
