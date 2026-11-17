import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { NewOrderForm } from "./new-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requireUser();
  return <NewOrderForm shipDays={config.SHIP_DEADLINE_HOURS / 24} inspectHours={config.INSPECT_WINDOW_HOURS} />;
}
