"use client";

import { useEffect } from "react";

/**
 * โหมดสองจอ: /duo เปิดแต่ละจอด้วย ?duoRole=BUYER|SELLER
 * จำไว้ใน sessionStorage ของจอนั้น เพื่อให้ฟอร์มสร้างรายการเลือกบทบาทให้ตรงกับจอ
 * (กันกรณีจอ "ผู้ขาย" สร้างดีลเป็นผู้ซื้อโดยไม่ตั้งใจ แล้วกลายเป็นคนต้องโอนเงิน)
 */
const KEY = "waijai_duo_role";

export function DuoRoleCapture() {
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("duoRole");
      if (r === "BUYER" || r === "SELLER") sessionStorage.setItem(KEY, r);
    } catch {
      /* storage ถูกปิด — ไม่เป็นไร */
    }
  }, []);
  return null;
}

export function readDuoRole(): "BUYER" | "SELLER" | null {
  try {
    const r = sessionStorage.getItem(KEY);
    return r === "BUYER" || r === "SELLER" ? r : null;
  } catch {
    return null;
  }
}
