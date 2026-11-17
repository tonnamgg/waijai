import { describe, expect, it } from "vitest";
import { bahtToSatang, calcFee, calcTotal, formatTHB, satangToBahtString } from "@/lib/money";
import { heldBalance } from "@/lib/ledger";

describe("money", () => {
  it("แปลงบาทเป็นสตางค์แบบจำนวนเต็ม", () => {
    expect(bahtToSatang("1,290")).toBe(129000);
    expect(bahtToSatang("3,000.00")).toBe(300000);
    expect(bahtToSatang("0.1")).toBe(10);
    expect(bahtToSatang("19.99")).toBe(1999);
    expect(bahtToSatang(25)).toBe(2500);
  });

  it("ปฏิเสธรูปแบบที่ไม่ถูกต้อง", () => {
    expect(() => bahtToSatang("abc")).toThrow();
    expect(() => bahtToSatang("1.234")).toThrow();
    expect(() => bahtToSatang("-5")).toThrow();
  });

  it("format เป็น ฿", () => {
    expect(formatTHB(129000)).toBe("฿1,290");
    expect(formatTHB(131500)).toBe("฿1,315");
    expect(formatTHB(129050)).toBe("฿1,290.50");
    expect(formatTHB(458000)).toBe("฿4,580");
    expect(formatTHB(100, { forceDecimals: true })).toBe("฿1.00");
    expect(satangToBahtString(129005)).toBe("1290.05");
  });

  it("ปฏิเสธเงินที่ไม่ใช่จำนวนเต็มสตางค์", () => {
    expect(() => formatTHB(1.5)).toThrow();
    expect(() => calcFee(100.5)).toThrow();
  });

  it("ค่าบริการ 2% ปัดลงเป็นบาท ขั้นต่ำ ฿10 (ตรงดีไซน์ ฿1,290 → ฿25)", () => {
    expect(calcFee(129000)).toBe(2500);
    expect(calcTotal(129000)).toEqual({ price: 129000, fee: 2500, total: 131500 });
    expect(calcFee(10000)).toBe(1000); // ฿100 → 2 บาท → ขั้นต่ำ 10
    expect(calcFee(240000)).toBe(4800);
    expect(() => calcFee(0)).toThrow();
  });

  it("ledger: ยอดพัก = HOLD − ออก", () => {
    expect(heldBalance([{ type: "HOLD", amountSatang: 131500 }])).toBe(131500);
    expect(
      heldBalance([
        { type: "HOLD", amountSatang: 131500 },
        { type: "RELEASE_TO_SELLER", amountSatang: 129000 },
        { type: "FEE", amountSatang: 2500 },
      ]),
    ).toBe(0);
  });
});
