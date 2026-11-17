import { z } from "zod";
import { config } from "./config";

const fileUrl = z.string().regex(/^\/api\/files\/[\w.-]+$/, "URL รูปไม่ถูกต้อง");

export const createOrderSchema = z
  .object({
    role: z.enum(["BUYER", "SELLER"]),
    title: z.string().trim().min(1, "กรุณาใส่ชื่อสินค้า").max(120, "ชื่อสินค้ายาวเกินไป"),
    price: z
      .string()
      .trim()
      .min(1, "กรุณาใส่ราคา")
      .regex(/^[\d,]+(\.\d{1,2})?$/, "ราคาไม่ถูกต้อง"),
    counterparty: z.string().trim().max(50).optional().default(""),
    specText: z.string().trim().min(1, "กรุณาใส่รายละเอียดที่ต้องตรงปก").max(2000),
    photoUrls: z.array(fileUrl).max(config.MAX_LISTING_PHOTOS, `ใส่รูปได้สูงสุด ${config.MAX_LISTING_PHOTOS} รูป`).default([]),
  })
  .refine((v) => v.role === "BUYER" || v.photoUrls.length >= 1, {
    message: "ผู้ขายต้องใส่รูปสินค้าจริงอย่างน้อย 1 รูป",
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
