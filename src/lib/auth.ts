/**
 * Mock auth (Milestone 9 จะเปลี่ยนเป็น OTP จริง)
 * เก็บ username ใน cookie — สลับผู้ใช้ได้ที่หน้า "บัญชี" เพื่อทดสอบทั้งฝั่งผู้ซื้อ/ผู้ขาย/แอดมิน
 */
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { Actor } from "./order-machine";
import { HttpError } from "./http";

export const AUTH_COOKIE = "waijai_user";
export const DEFAULT_USERNAME = "mint";

export async function getCurrentUser() {
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
