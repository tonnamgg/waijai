// กติกาหลัก (SPEC ข้อ 2) — แก้ตัวเลขที่นี่ที่เดียว
export const config = {
  PAYMENT_DEADLINE_HOURS: 24,
  SHIP_DEADLINE_HOURS: 72,
  INSPECT_WINDOW_HOURS: 48,
  DELIVERY_MAX_DAYS: 14,
  /** รหัสเกม: ผู้ขายต้องส่งข้อมูลล็อกอินภายในกี่ชั่วโมงหลังจ่าย / ผู้ซื้อมีเวลาตรวจกี่ชั่วโมง */
  DIGITAL_DELIVER_HOURS: 24,
  DIGITAL_INSPECT_HOURS: 24,
  FEE_PERCENT: 2,
  FEE_MIN_SATANG: 10_00,
  /** ปัดค่าบริการลงเป็นจำนวนบาทเต็ม (฿1,290 → ฿25) */
  FEE_ROUND_TO_BAHT: true,
  MAX_LISTING_PHOTOS: 4,
  MAX_UPLOAD_BYTES: 50 * 1024 * 1024,
} as const;

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
