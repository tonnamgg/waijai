/**
 * Mock auth (Milestone 9 จะเปลี่ยนเป็น OTP จริง)
 *
 * ระบุตัวผู้ใช้ได้ 2 ทาง (เรียงตามลำดับความสำคัญ):
 * 1) ชื่อโดเมนย่อย `<username>.localhost` — โหมดเดโมสองจอ: แต่ละหน้าต่าง/iframe ล็อกเป็นคนละคน
 *    เปิดใช้เฉพาะตอน dev (หรือ ALLOW_DEV_TOOLS=1) เพราะใครก็ตั้ง Host header เองได้
 * 2) cookie `waijai_user` — สลับผู้ใช้ได้ที่หน้า "บัญชี"
 */
import { cookies, headers } from "next/headers";
import { prisma } from "./db";
import type { Actor } from "./order-machine";
import { HttpError } from "./http";

export const AUTH_COOKIE = "waijai_user";
export const DEFAULT_USERNAME = "mint";

const devIdentityEnabled = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_TOOLS === "1";

/** `gadgetbkk.localhost:3000` → "gadgetbkk" */
export function usernameFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname.endsWith(".localhost")) return null;
  return hostname.slice(0, -".localhost".length) || null;
}

/** username ที่ล็อกไว้จาก URL ของหน้าต่างนี้ (null = ใช้ cookie ตามปกติ) */
export async function hostLockedUsername(): Promise<string | null> {
  if (!devIdentityEnabled()) return null;
  return usernameFromHost((await headers()).get("host"));
}

export async function getCurrentUser() {
  const fromHost = await hostLockedUsername();
  if (fromHost) {
    const u = await prisma.user.findUnique({ where: { username: fromHost } });
    if (u) return u;
  }
  const jar = await cookies();
  const username = jar.get(AUTH_COOKIE)?.value ?? DEFAULT_USERNAME;
  const user =
    (await prisma.user.findUnique({ where: { username } })) ??
    (await prisma.user.findUnique({ where: { username: DEFAULT_USERNAME } }));
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "กรุณาเข้าสู่ระบบ (ยังไม่ได้ seed ฐานข้อมูล? รัน npm run setup)");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "เฉพาะแอดมินเท่านั้น");
  return user;
}

export function userActor(user: { id: string }): Actor {
  return { kind: "user", id: user.id };
}
