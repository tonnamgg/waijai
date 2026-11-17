import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderForUser, toDTO } from "@/lib/orders";
import { HttpError } from "@/lib/http";
import { PayClient } from "./pay-client";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  if (order.buyerId !== user.id || order.status !== "CREATED") redirect(`/orders/${id}`);
  return <PayClient order={toDTO(order)} />;
}
