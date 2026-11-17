import { processDeadlines } from "./lib/deadlines";

const g = globalThis as unknown as { __waijaiCron?: NodeJS.Timeout };

if (process.env.DISABLE_INTERNAL_CRON !== "1" && !g.__waijaiCron) {
  g.__waijaiCron = setInterval(async () => {
    try {
      const r = await processDeadlines();
      if (r.cancelled || r.refunded || r.released) console.log("[cron] deadlines", r);
    } catch (e) {
      console.error("[cron] failed", e);
    }
  }, 60_000);
}
