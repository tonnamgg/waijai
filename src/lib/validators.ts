import { z } from "zod";
import { config } from "./config";
import { gameById } from "./games";

const fileUrl = z.string().regex(/^\/api\/files\/[\w.-]+$/, "URL รูปไม่ถูกต้อง");

export const createOrderSchema = z
  .object({
    // ผู้ขายเป็นคนเปิดดีลเท่านั้น — ผู้ซื้อเข้าร่วมด้วยลิงก์
    role: z.literal("SELLER", { errorMap: () => ({ message: "ผู้ซื้อไม่ต้องสร้างรายการ — ขอลิงก์จากผู้ขายแล้ววางที่หน้าแรก" }) }).default("SELLER"),
    title: z.string().trim().min(1, "กรุณาใส่ชื่อสินค้า").max(120, "ชื่อสินค้ายาวเกินไป"),
    price: z
      .string()
      .trim()
      .min(1, "กรุณาใส่ราคา")
      .regex(/^[\d,]+(\.\d{1,2})?$/, "ราคาไม่ถูกต้อง"),
    counterparty: z.string().trim().max(50).optional().default(""),
    specText: z.string().trim().min(1, "กรุณาใส่รายละเอียดที่ต้องตรงปก").max(2000),
    photoUrls: z.array(fileUrl).max(config.MAX_LISTING_PHOTOS, `ใส่รูปได้สูงสุด ${config.MAX_LISTING_PHOTOS} รูป`).default([]),
    kind: z.enum(["PHYSICAL", "GAME_ACCOUNT"]).default("PHYSICAL"),
    game: z.string().trim().max(30).optional(),
    region: z.string().trim().max(30).optional().default(""),
    rank: z.string().trim().max(60).optional().default(""),
  })
  .refine((v) => v.kind !== "GAME_ACCOUNT" || !!gameById(v.game), { message: "กรุณาเลือกเกม", path: ["game"] })
  .refine((v) => v.photoUrls.length >= 1, {
    message: "ใส่รูปสินค้าจริง (หรือภาพหน้าจอบัญชีเกม) อย่างน้อย 1 รูป",
    path: ["photoUrls"],
  });

export const payInputSchema = z.object({ method: z.enum(["promptpay", "card", "mobile_banking"]) });

export const shipInputSchema = z.object({
  carrier: z.string().trim().min(1, "กรุณาเลือกขนส่ง").max(40),
  trackingNo: z
    .string()
    .trim()
    .min(5, "เลขพัสดุสั้นเกินไป")
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "เลขพัสดุใช้ได้เฉพาะตัวอักษรอังกฤษและตัวเลข"),
});

export const disputeInputSchema = z.object({
  reason: z.enum(["NOT_RECEIVED", "NOT_AS_DESCRIBED", "DAMAGED", "OTHER"]),
  detail: z.string().trim().min(5, "กรุณาอธิบายปัญหาอย่างน้อย 5 ตัวอักษร").max(2000),
  mismatchItems: z.array(z.string().max(200)).max(20).default([]),
});

export const disputeResponseSchema = z.object({
  text: z.string().trim().min(5, "กรุณาอธิบายอย่างน้อย 5 ตัวอักษร").max(2000),
});

export const ratingInputSchema = z.object({
  stars: z.number().int().min(1, "กรุณาเลือกดาว").max(5),
  comment: z.string().trim().max(300).optional(),
});

export const resolveInputSchema = z.object({ resolution: z.enum(["REFUND", "RELEASE"]) });

export const credentialInputSchema = z.object({
  login: z.string().trim().min(1, "กรุณาใส่ไอดี / อีเมลที่ใช้ล็อกอิน").max(120),
  password: z.string().min(1, "กรุณาใส่รหัสผ่าน").max(200),
  note: z.string().trim().max(500).optional().default(""),
});

export const messageInputSchema = z.object({
  body: z.string().trim().min(1, "พิมพ์ข้อความก่อนส่ง").max(1000, "ข้อความยาวเกินไป (สูงสุด 1,000 ตัวอักษร)"),
});

export const roomPollSchema = z.object({ typing: z.boolean().optional().default(false) });

export const switchUserSchema = z.object({ username: z.string().min(1).max(40) });

export const uploadKindSchema = z.enum(["LISTING", "PACKING", "RECEIVED", "UNBOXING_VIDEO", "DISPUTE_EVIDENCE"]);

/** แยก textarea ทีละบรรทัด → checklistItems[] */
export function parseChecklist(specText: string): string[] {
  return specText
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}
