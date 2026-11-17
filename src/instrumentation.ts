/** รัน cron ภายในโปรเซส (ทุก 60 วินาที) ตอน dev / next start — production จริงใช้ Vercel Cron เรียก /api/cron/tick */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
