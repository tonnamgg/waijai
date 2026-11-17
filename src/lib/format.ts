// แสดงวันเวลาแบบไทย โดยตรึงเป็นเวลาไทย (UTC+7) ให้ server/client ตรงกัน
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const OFFSET = 7 * 60 * 60 * 1000;

function bkk(d: Date | string) {
  return new Date(new Date(d).getTime() + OFFSET);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "9 พ.ย. · 14:20" */
export function formatDateTime(d: Date | string): string {
  const x = bkk(d);
  return `${x.getUTCDate()} ${TH_MONTHS[x.getUTCMonth()]} · ${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}

/** "12 พ.ย." */
export function formatDate(d: Date | string): string {
  const x = bkk(d);
  return `${x.getUTCDate()} ${TH_MONTHS[x.getUTCMonth()]}`;
}

/** "12 พ.ย. 2569" */
export function formatDateFull(d: Date | string): string {
  const x = bkk(d);
  return `${x.getUTCDate()} ${TH_MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear() + 543}`;
}

export function relativeTime(d: Date | string, now = Date.now()): string {
  const diff = Math.round((now - new Date(d).getTime()) / 1000);
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

/** แยกเวลาที่เหลือเป็น วัน/ชม./นาที/วินาที */
export function splitRemaining(ms: number) {
  const clamped = Math.max(0, ms);
  const totalMin = Math.floor(clamped / 60000);
  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    totalHours: Math.floor(totalMin / 60),
    minutes: totalMin % 60,
    seconds: Math.floor((clamped % 60000) / 1000),
    expired: ms <= 0,
  };
}

export function formatRemaining(ms: number): string {
  const r = splitRemaining(ms);
  if (r.expired) return "หมดเวลาแล้ว";
  if (r.totalHours >= 72) return `${r.days} วัน ${r.hours} ชม.`;
  if (r.totalHours >= 1) return `${r.totalHours} ชม. ${r.minutes} นาที`;
  return `${r.minutes} นาที ${r.seconds} วินาที`;
}
