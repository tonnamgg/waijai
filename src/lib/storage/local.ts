import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "../config";
import { HttpError } from "../http";
import type { StorageProvider } from "./provider";

const DIR = path.join(process.cwd(), "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
// svg อ่านได้อย่างเดียว (รูปตัวอย่างจาก seed) — ไม่รับอัปโหลดเพื่อกัน XSS
const MIME: Record<string, string> = { ...Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m])), svg: "image/svg+xml" };

/** เก็บไฟล์ในโฟลเดอร์ ./uploads แล้วเสิร์ฟผ่าน /api/files/[name] (เปลี่ยนเป็น S3/R2 ได้ภายหลัง) */
export const LocalStorage: StorageProvider = {
  async save(file) {
    const ext = EXT[file.type];
    if (!ext) throw new HttpError(415, "รองรับเฉพาะไฟล์รูป (jpg/png/webp/gif/heic) หรือวิดีโอ (mp4/mov/webm)");
    if (file.size > config.MAX_UPLOAD_BYTES) throw new HttpError(413, "ไฟล์ใหญ่เกิน 50MB");
    await mkdir(DIR, { recursive: true });
    const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
    return { url: `/api/files/${name}`, mime: file.type, size: file.size };
  },
  async read(name) {
    if (!/^[\w.-]+$/.test(name)) return null;
    try {
      const data = await readFile(path.join(DIR, name));
      const ext = name.split(".").pop() ?? "";
      return { data, mime: MIME[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  },
};

export const storage = LocalStorage;
