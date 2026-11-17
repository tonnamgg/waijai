/** เกมที่ขายรหัสได้ — ชื่อใช้เป็นข้อความเท่านั้น (ไม่ใช้โลโก้) */
export type Game = { id: string; name: string; short: string; rankHint: string; regionHint: string };

export const GAMES: Game[] = [
  { id: "valorant", name: "Valorant", short: "VL", rankHint: "เช่น Diamond 2", regionHint: "เช่น AP" },
  { id: "rov", name: "ROV", short: "RV", rankHint: "เช่น Conqueror", regionHint: "เช่น TH" },
  { id: "freefire", name: "Free Fire", short: "FF", rankHint: "เช่น Heroic", regionHint: "เช่น TH" },
  { id: "pubgm", name: "PUBG Mobile", short: "PG", rankHint: "เช่น Ace", regionHint: "เช่น Asia" },
  { id: "genshin", name: "Genshin Impact", short: "GI", rankHint: "เช่น AR 60", regionHint: "เช่น Asia" },
  { id: "hsr", name: "Honkai: Star Rail", short: "HS", rankHint: "เช่น TL 70", regionHint: "เช่น Asia" },
  { id: "lol", name: "League of Legends", short: "LL", rankHint: "เช่น Platinum 4", regionHint: "เช่น TH" },
  { id: "mlbb", name: "Mobile Legends", short: "ML", rankHint: "เช่น Mythic", regionHint: "เช่น SEA" },
  { id: "roblox", name: "Roblox", short: "RB", rankHint: "เช่น มี Robux 2,000", regionHint: "-" },
  { id: "steam", name: "บัญชี Steam", short: "ST", rankHint: "เช่น มี 40 เกม", regionHint: "เช่น TH" },
  { id: "other", name: "เกมอื่น ๆ", short: "GM", rankHint: "เลเวล / แรงก์", regionHint: "เซิร์ฟเวอร์" },
];

export const gameById = (id: string | undefined | null) => GAMES.find((g) => g.id === id) ?? null;

/** เช็กลิสต์มาตรฐานของรหัสเกม — ต่อท้ายรายละเอียดที่ผู้ขายพิมพ์ */
export const GAME_BASE_CHECKS = [
  "ล็อกอินเข้าได้ด้วยข้อมูลที่ได้รับ",
  "เปลี่ยนรหัสผ่าน/อีเมลเป็นของผู้ซื้อได้",
  "ไม่มีเบอร์โทร/2FA ของผู้ขายผูกอยู่",
];

export type GameMeta = { game?: string; region?: string; rank?: string };

export function gameTitle(meta: GameMeta) {
  const g = gameById(meta.game);
  return [g?.name, meta.rank].filter(Boolean).join(" · ");
}
