import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TransitionError } from "./order-machine";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** ห่อ route handler: แปลง error เป็น JSON ที่หน้าเว็บเอาไปแสดงได้ */
export function route<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof TransitionError) {
        const status = e.code === "FORBIDDEN" ? 403 : e.code === "PRECONDITION" ? 422 : 409;
        return NextResponse.json({ error: e.message, code: e.code }, { status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง", issues: e.issues }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
