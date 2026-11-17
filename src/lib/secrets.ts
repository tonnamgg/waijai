/**
 * เข้ารหัสข้อมูลลับ (ข้อมูลล็อกอินรหัสเกม) ก่อนเก็บลง DB — AES-256-GCM
 * key มาจาก CREDENTIALS_KEY (ตอน dev ถ้าไม่ตั้งจะใช้ค่าสำรอง — production ต้องตั้งเสมอ)
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw && process.env.NODE_ENV === "production") throw new Error("CREDENTIALS_KEY is not set");
  return createHash("sha256").update(raw ?? "waijai-dev-credentials-key").digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decryptJson<T>(payload: string): T {
  const [iv, tag, data] = payload.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8")) as T;
}

export type GameCredential = { login: string; password: string; note?: string };
