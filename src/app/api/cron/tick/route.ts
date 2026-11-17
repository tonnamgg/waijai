import { getCurrentUser } from "@/lib/auth";
import { processDeadlines } from "@/lib/deadlines";
import { HttpError, route } from "@/lib/http";

/** เรียกทุก 5 นาที (Vercel Cron / node-cron) — ต้องมี CRON_SECRET หรือเป็นแอดมิน */
async function tick(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  const okSecret = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
  if (!okSecret) {
    const user = await getCurrentUser();
    if (user?.role !== "admin") throw new HttpError(401, "unauthorized");
  }
  return processDeadlines();
}

export const GET = route(tick);
export const POST = route(tick);
