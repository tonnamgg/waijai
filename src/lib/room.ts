/**
 * ห้องดีล — ตรรกะที่ใช้ได้ทั้งฝั่ง server และ client (ไม่ import prisma)
 * - ตอนนี้ถึงตาใคร ต้องทำอะไร
 * - ขั้นของ flow แบบย่อ 5 ขั้น
 * - แปลง OrderEvent เป็นข้อความระบบในแชท
 */
import { formatTHB } from "./money";
import type { OrderDTO } from "./orders";
import type { Role } from "./types";

export type RoomMessage = { id: string; senderId: string; body: string; createdAt: string; pending?: boolean };
export type RoomPresence = { userId: string; seenAt: string; typingAt: string | null };
export type RoomSnapshot = { version: string; messages: RoomMessage[]; presence: RoomPresence[] };

export const ONLINE_WINDOW_MS = 8_000;
export const TYPING_WINDOW_MS = 4_000;

// ---------- ถึงตาใคร ----------

export type Turn = {
  /** ใครต้องลงมือ: BUYER/SELLER = คู่สัญญา, JOIN = รออีกฝ่ายเปิดลิงก์, ADMIN = รอแอดมิน, NONE = จบแล้ว */
  who: Role | "JOIN" | "ADMIN" | "NONE";
  /** สิ่งที่ต้องทำ (ใช้ทั้งข้อความ "ตาคุณ: ..." และ "รอ @x ...") */
  task: string;
  deadline: string | null;
};

export function turnOf(o: OrderDTO): Turn {
  switch (o.status) {
    case "CREATED":
      if (!o.buyer || !o.seller) return { who: "JOIN", task: `กดรับรายการจากลิงก์`, deadline: null };
      return { who: "BUYER", task: "จ่ายเงินเข้าตัวกลาง", deadline: o.paymentDeadline };
    case "PAID_HELD":
      return { who: "SELLER", task: o.kind === "GAME_ACCOUNT" ? "ส่งรหัสเกมในห้องดีล" : "แพ็กของและแจ้งเลขพัสดุ", deadline: o.shipDeadline };
    case "SHIPPED":
      return { who: "BUYER", task: "รอรับของ แล้วกด 'ได้รับของแล้ว'", deadline: null };
    case "DELIVERED":
      return {
        who: "BUYER",
        task: o.kind === "GAME_ACCOUNT" ? "ล็อกอินตรวจ เปลี่ยนรหัสผ่าน แล้วยืนยัน" : "ตรวจของเทียบเช็กลิสต์ แล้วยืนยัน",
        deadline: o.inspectDeadline,
      };
    case "DISPUTED":
      return { who: "ADMIN", task: "ตรวจหลักฐานและตัดสินข้อพิพาท", deadline: null };
    default:
      return { who: "NONE", task: "", deadline: null };
  }
}

// ---------- Flow 5 ขั้น ----------

export type FlowStep = { key: string; label: string; owner: Role | "BOTH"; state: "done" | "current" | "todo" | "warn" | "halted" };

export function flowSteps(o: OrderDTO): FlowStep[] {
  const defs: Omit<FlowStep, "state">[] = [
    { key: "join", label: "เข้าห้องดีล", owner: "BOTH" },
    { key: "pay", label: "จ่ายเงิน", owner: "BUYER" },
    { key: "ship", label: o.kind === "GAME_ACCOUNT" ? "ส่งรหัส" : "ส่งของ", owner: "SELLER" },
    { key: "inspect", label: o.kind === "GAME_ACCOUNT" ? "ตรวจรหัส" : "ตรวจของ", owner: "BUYER" },
    { key: "done", label: "ปล่อยเงิน", owner: "BOTH" },
  ];
  const both = !!o.buyer && !!o.seller;
  const reached = o.deliveredAt || o.shippedAt ? 3 : o.paidAt ? 2 : both ? 1 : 0;
  const current =
    o.status === "CREATED" ? (both ? 1 : 0) : o.status === "PAID_HELD" ? 2 : o.status === "SHIPPED" || o.status === "DELIVERED" ? 3 : o.status === "RELEASED" ? 5 : reached;

  return defs.map((d, i) => {
    let state: FlowStep["state"] = i < current ? "done" : i === current ? "current" : "todo";
    if (i === current && o.status === "DISPUTED") state = "warn";
    if (i === current && (o.status === "REFUNDED" || o.status === "CANCELLED")) state = "halted";
    return { ...d, state };
  });
}

// ---------- ข้อความระบบในแชท ----------

export type SystemLine = { id: string; createdAt: string; tone: "accent" | "amber" | "muted"; icon: SystemIcon; text: string; sub?: string };
export type SystemIcon = "open" | "join" | "lock" | "truck" | "box" | "check" | "scale" | "undo" | "cancel" | "key";

export function eventLines(o: OrderDTO, nameOf: (userId: string) => string): SystemLine[] {
  const name = (actor: string) => (actor === "SYSTEM" ? "ระบบ" : nameOf(actor));
  return o.events.map((e) => {
    const base = { id: `ev-${e.id}`, createdAt: e.createdAt };
    if (e.from === null) return { ...base, tone: "muted", icon: "open", text: `${name(e.actor)} เปิดดีล "${o.title}" ราคา ${formatTHB(o.priceSatang)}` };
    if (e.from === "CREATED" && e.to === "CREATED") return { ...base, tone: "accent", icon: "join", text: `${name(e.actor)} เข้าห้องดีลแล้ว`, sub: "ตอนนี้ทั้งสองฝ่ายคุยกันได้แล้ว" };
    switch (e.to) {
      case "PAID_HELD":
        return {
          ...base,
          tone: "accent",
          icon: "lock",
          text: `ผู้ซื้อจ่าย ${formatTHB(o.priceSatang + o.feeSatang)} เข้าตัวกลางแล้ว`,
          sub: o.kind === "GAME_ACCOUNT" ? "ไว้ใจพักเงินไว้ · ผู้ขายส่งรหัสได้เลย" : "ไว้ใจพักเงินไว้ · ผู้ขายส่งของได้เลย",
        };
      case "SHIPPED":
        return { ...base, tone: "accent", icon: "truck", text: "ผู้ขายส่งของแล้ว", sub: [o.carrier, o.trackingNo].filter(Boolean).join(" · ") || e.note || undefined };
      case "DELIVERED":
        if (e.from === "PAID_HELD")
          return { ...base, tone: "accent", icon: "key", text: "ผู้ขายส่งรหัสเกมแล้ว", sub: "ผู้ซื้อกดดูรหัสได้ในห้องนี้ · ล็อกอินตรวจแล้วเปลี่ยนรหัสผ่านทันที" };
        return { ...base, tone: "accent", icon: "box", text: "ของถึงมือผู้ซื้อแล้ว", sub: e.note ?? undefined };
      case "RELEASED":
        return { ...base, tone: "accent", icon: "check", text: `ปล่อยเงิน ${formatTHB(o.priceSatang)} ให้ผู้ขายแล้ว`, sub: e.note ?? undefined };
      case "DISPUTED":
        return { ...base, tone: "amber", icon: "scale", text: "เปิดข้อพิพาท · เงินยังพักอยู่กับไว้ใจ", sub: e.note ?? undefined };
      case "REFUNDED":
        return { ...base, tone: "muted", icon: "undo", text: `คืนเงิน ${formatTHB(o.priceSatang + o.feeSatang)} ให้ผู้ซื้อแล้ว`, sub: e.note ?? undefined };
      case "CANCELLED":
        return { ...base, tone: "muted", icon: "cancel", text: "ดีลถูกยกเลิก", sub: e.note ?? undefined };
      default:
        return { ...base, tone: "muted", icon: "open", text: e.note ?? e.to };
    }
  });
}

// ---------- ลิงก์ ----------

/** origin ที่แชร์ให้คนอื่นได้ — ตัด `<username>.` ของโหมดเดโมสองจอออก */
export function publicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  const host = hostname.endsWith(".localhost") ? "localhost" : hostname;
  return `${protocol}//${host}${port ? `:${port}` : ""}`;
}

/** ดึง shareCode จากลิงก์/ข้อความที่ผู้ใช้วาง เช่น "http://x/o/AbC_12" หรือ "AbC_12" */
export function extractShareCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/\/o\/([\w-]+)/);
  if (m) return m[1];
  return /^[\w-]{4,32}$/.test(s) ? s : null;
}
