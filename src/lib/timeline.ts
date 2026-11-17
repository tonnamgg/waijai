import type { Step } from "@/components/Timeline";
import { formatDate, formatDateTime } from "./format";
import { config, DAY } from "./config";
import type { OrderDTO } from "./orders";
import type { Role } from "./types";

/** สร้าง 6 ขั้นของ timeline จากสถานะ + timestamp (SPEC 5.4) */
export function buildSteps(o: OrderDTO, role: Role | null): Step[] {
  const isSeller = role === "SELLER";
  const lastNote = (to: string) => [...o.events].reverse().find((e) => e.to === to && e.from !== to)?.note ?? "";

  const doneCount = (() => {
    switch (o.status) {
      case "CREATED":
        return 0;
      case "PAID_HELD":
        return 1;
      case "SHIPPED":
        return 2;
      case "DELIVERED":
        return 4;
      case "RELEASED":
        return 6;
      default:
        return o.deliveredAt ? 4 : o.shippedAt ? 2 : o.paidAt ? 1 : 0;
    }
  })();

  const eta = o.shippedAt ? formatDate(new Date(new Date(o.shippedAt).getTime() + 2 * DAY)) : "";
  const releaseNote = o.status === "RELEASED" ? lastNote("RELEASED") : "";

  const defs: { key: string; title: string; titleTodo?: string; sub: string; subDone?: string }[] = [
    {
      key: "paid",
      title: "จ่ายเงินเข้าตัวกลางแล้ว",
      titleTodo: "จ่ายเงินเข้าตัวกลาง",
      sub: o.buyer ? "รอผู้ซื้อชำระเงิน" : "รอคู่สัญญารับรายการ",
      subDone: o.paidAt ? `${formatDateTime(o.paidAt)} · ไว้ใจพักเงินไว้` : "",
    },
    {
      key: "shipped",
      title: "ผู้ขายส่งของแล้ว",
      titleTodo: "ผู้ขายส่งของ",
      sub: `ต้องส่งภายใน ${config.SHIP_DEADLINE_HOURS / 24} วันหลังจ่ายเงิน`,
      subDone: o.shippedAt ? `${formatDateTime(o.shippedAt)} · แนบเลขพัสดุแล้ว` : "",
    },
    {
      key: "transit",
      title: "กำลังขนส่ง",
      sub: o.shippedAt ? `${o.carrier ?? "ขนส่ง"} · คาดว่าถึง ${eta}` : "ติดตามได้ด้วยเลขพัสดุ",
      subDone: o.deliveredAt ? `${o.carrier ?? "ขนส่ง"} · ส่งถึงปลายทางแล้ว` : "",
    },
    {
      key: "delivered",
      title: isSeller ? "ของถึงมือผู้ซื้อ" : "ของถึงมือคุณ",
      sub: `มีเวลาตรวจของ ${config.INSPECT_WINDOW_HOURS} ชม.`,
      subDone: o.deliveredAt ? `${formatDateTime(o.deliveredAt)} · เริ่มนับเวลาตรวจของ` : "",
    },
    {
      key: "confirm",
      title: "ยืนยันว่าตรงปก",
      sub: isSeller ? "ผู้ซื้อตรวจเทียบกับเช็กลิสต์" : "ถ่ายวิดีโอตอนแกะกล่องไว้ด้วย",
      subDone: releaseNote || "ผู้ซื้อยืนยันแล้ว",
    },
    {
      key: "release",
      title: "โอนเงินให้ผู้ขาย",
      sub: isSeller ? "เงินเข้าบัญชีคุณทันทีหลังผู้ซื้อยืนยัน" : "ระบบโอนทันทีหลังคุณยืนยัน",
      subDone: o.releasedAt ? `${formatDateTime(o.releasedAt)} · โอนเรียบร้อย` : "",
    },
  ];

  const halted = o.status === "DISPUTED" || o.status === "REFUNDED" || o.status === "CANCELLED";

  return defs.map((d, i) => {
    let state: Step["state"] = i < doneCount ? "done" : i === doneCount && !halted ? "current" : "todo";
    if (o.status === "DISPUTED" && i === doneCount) state = "warn";
    const title = state === "done" ? d.title : d.titleTodo ?? d.title;
    let sub = state === "done" ? d.subDone || d.sub : d.sub;
    if (state === "warn") sub = "อยู่ระหว่างตรวจสอบข้อพิพาท";
    return { key: d.key, title, sub, state };
  });
}
