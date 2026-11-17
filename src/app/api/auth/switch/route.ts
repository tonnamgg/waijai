import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE } from "@/lib/auth";
import { HttpError, readJson, route } from "@/lib/http";
import { switchUserSchema } from "@/lib/validators";

/** Mock login: สลับผู้ใช้ (ใช้ทดสอบ flow ทั้งสองฝั่ง) */
export const POST = route(async (req) => {
  const { username } = switchUserSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new HttpError(404, "ไม่พบผู้ใช้");
  const res = NextResponse.json({ ok: true, user: { username: user.username, displayName: user.displayName } });
  res.cookies.set(AUTH_COOKIE, user.username, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
});
