import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { getOrderForUser } from "@/lib/orders";
import { storage } from "@/lib/storage/local";
import { uploadKindSchema } from "@/lib/validators";

/**
 * อัปโหลดรูป/วิดีโอ (multipart: file, orderId?, kind?)
 * - ไม่มี orderId → คืน url อย่างเดียว (ใช้ตอนสร้างรายการ)
 * - มี orderId + kind → ผูกเข้ารายการทันที (ต้องเป็นคู่สัญญา)
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "ไม่พบไฟล์");

  const orderId = form.get("orderId");
  const kindRaw = form.get("kind");

  if (typeof orderId === "string" && orderId) {
    const kind = uploadKindSchema.parse(kindRaw);
    const order = await getOrderForUser(orderId, user);
    const isBuyer = order.buyerId === user.id;
    const isSeller = order.sellerId === user.id;
    const allowed =
      (kind === "PACKING" && isSeller) ||
      ((kind === "RECEIVED" || kind === "UNBOXING_VIDEO") && isBuyer) ||
      (kind === "DISPUTE_EVIDENCE" && (isBuyer || isSeller)) ||
      (kind === "LISTING" && (isBuyer || isSeller) && order.status === "CREATED");
    if (!allowed) throw new HttpError(403, "คุณไม่มีสิทธิ์อัปโหลดไฟล์ประเภทนี้");
    if (kind === "UNBOXING_VIDEO" && !file.type.startsWith("video/")) throw new HttpError(415, "กรุณาเลือกไฟล์วิดีโอ");

    const saved = await storage.save(file);
    const media = await prisma.orderMedia.create({
      data: { orderId, kind, url: saved.url, mime: saved.mime, uploadedBy: user.id },
    });
    return { id: media.id, url: saved.url, mime: saved.mime, kind };
  }

  if (!file.type.startsWith("image/")) throw new HttpError(415, "รูปสินค้าต้องเป็นไฟล์รูปภาพ");
  const saved = await storage.save(file);
  return { url: saved.url, mime: saved.mime };
});
