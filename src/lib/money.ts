import { config } from "./config";

/** บาท (ตัวเลข/สตริงจากฟอร์ม) → สตางค์ (Int) โดยไม่ผ่าน float arithmetic */
export function bahtToSatang(input: string | number): number {
  const s = String(input).replace(/[,\s฿]/g, "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(s)) throw new Error("รูปแบบจำนวนเงินไม่ถูกต้อง");
  const [whole, frac = ""] = s.split(".");
  const satang = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  assertInt(satang);
  return satang;
}

export function satangToBahtString(satang: number): string {
  assertInt(satang);
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
}

/** "฿1,290" หรือ "฿1,290.50" */
export function formatTHB(satang: number, opts: { forceDecimals?: boolean } = {}): string {
  assertInt(satang);
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = abs % 100;
  const showFrac = opts.forceDecimals || frac !== 0;
  return `${sign}฿${whole}${showFrac ? "." + String(frac).padStart(2, "0") : ""}`;
}

/** ค่าบริการตัวกลาง: FEE_PERCENT% ขั้นต่ำ FEE_MIN (ผู้ซื้อจ่าย) */
export function calcFee(priceSatang: number): number {
  assertInt(priceSatang);
  if (priceSatang <= 0) throw new Error("ราคาต้องมากกว่า 0");
  let fee = Math.floor((priceSatang * config.FEE_PERCENT) / 100);
  if (config.FEE_ROUND_TO_BAHT) fee = Math.floor(fee / 100) * 100;
  return Math.max(fee, config.FEE_MIN_SATANG);
}

export function calcTotal(priceSatang: number): { price: number; fee: number; total: number } {
  const fee = calcFee(priceSatang);
  return { price: priceSatang, fee, total: priceSatang + fee };
}

function assertInt(n: number) {
  if (!Number.isSafeInteger(n)) throw new Error(`จำนวนเงินต้องเป็นจำนวนเต็มสตางค์: ${n}`);
}
