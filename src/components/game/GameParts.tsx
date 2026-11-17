"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CopyButton } from "@/components/CopyButton";
import { Countdown } from "@/components/Countdown";
import { api } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { gameById, type GameMeta } from "@/lib/games";
import type { OrderDTO } from "@/lib/orders";

/** ป้ายเกมแบบตัวอักษร (ไม่ใช้โลโก้) */
export function GameBadge({ game, size = 40 }: { game?: string; size?: number }) {
  const g = gameById(game);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-ink font-bold tracking-tight text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {g?.short ?? "GM"}
    </span>
  );
}

/** แถว เกม · แรงก์ · เซิร์ฟ */
export function GameInfo({ meta, className }: { meta: GameMeta; className?: string }) {
  const g = gameById(meta.game);
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <GameBadge game={meta.game} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{g?.name ?? "รหัสเกม"}</p>
        <p className="truncate text-[13px] text-muted">{[meta.rank, meta.region && meta.region !== "-" ? `เซิร์ฟ ${meta.region}` : null].filter(Boolean).join(" · ") || "รหัสเกม"}</p>
      </div>
    </div>
  );
}

type Cred = { login: string; password: string; note?: string };

/** ผู้ซื้อ: กดดูรหัส (บันทึกเวลาที่เปิดดู) · ผู้ขาย: เห็นสถานะว่าผู้ซื้อเปิดดูแล้วหรือยัง */
export function CredentialCard({ o, viewer }: { o: OrderDTO; viewer: "BUYER" | "SELLER" | "ADMIN" }) {
  const toast = useToast();
  const [cred, setCred] = useState<Cred | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!o.credential) return null;

  async function reveal() {
    setBusy(true);
    try {
      setCred(await api<Cred>(`/api/orders/${o.id}/credentials/reveal`));
      setShow(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const canSee = viewer !== "BUYER" || ["DELIVERED", "DISPUTED", "RELEASED"].includes(o.status);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-bold">
          <KeyRound className="h-4 w-4 text-accent" /> ข้อมูลล็อกอิน
        </p>
        <span className="text-[12px] text-muted" suppressHydrationWarning>
          {o.credential.revealedAt ? `ผู้ซื้อเปิดดู ${formatDateTime(o.credential.revealedAt)}` : viewer === "SELLER" ? "ผู้ซื้อยังไม่เปิดดู" : `ส่งเมื่อ ${formatDateTime(o.credential.sentAt)}`}
        </span>
      </div>

      {!canSee ? (
        <p className="mt-3 text-[14px] text-muted">ดูรหัสไม่ได้ในสถานะนี้</p>
      ) : !cred ? (
        <Button size="md" variant="dark" className="mt-3" loading={busy} icon={<Eye className="h-4 w-4" />} onClick={reveal}>
          {viewer === "BUYER" ? "กดดูไอดี / รหัสผ่าน" : "ดูข้อมูลที่ส่งไป"}
        </Button>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2">
            <Row label="ไอดี / อีเมล" value={cred.login} />
            <Row label="รหัสผ่าน" value={cred.password} secret={!show} onToggle={() => setShow((v) => !v)} />
            {cred.note && <p className="whitespace-pre-wrap rounded-btn bg-soft px-4 py-3 text-[14px]">{cred.note}</p>}
          </motion.div>
        </AnimatePresence>
      )}

      {viewer === "BUYER" && o.status === "DELIVERED" && (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-warn-text">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          ล็อกอินแล้วเปลี่ยนรหัสผ่าน อีเมล และเบอร์ให้เป็นของคุณทันที ก่อนกดปล่อยเงิน
          {o.inspectDeadline && (
            <>
              {" "}· เหลือ <Countdown to={o.inspectDeadline} className="tabular font-semibold" />
            </>
          )}
        </p>
      )}
    </section>
  );
}

function Row({ label, value, secret, onToggle }: { label: string; value: string; secret?: boolean; onToggle?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-btn bg-soft p-1.5 pl-4">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted">{label}</p>
        <p className="truncate font-mono text-[15px] font-semibold">{secret ? "•".repeat(Math.min(value.length, 12)) : value}</p>
      </div>
      {onToggle && (
        <button type="button" onClick={onToggle} aria-label={secret ? "แสดงรหัสผ่าน" : "ซ่อนรหัสผ่าน"} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface">
          {secret ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      )}
      <CopyButton text={value} />
    </div>
  );
}

/** ผู้ขาย: ส่งข้อมูลล็อกอินในห้องดีล */
export function CredentialSheet({ open, onClose, order, onSent }: { open: boolean; onClose: () => void; order: OrderDTO; onSent: () => void }) {
  const toast = useToast();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/orders/${order.id}/credentials`, { login, password, note });
      toast("ส่งรหัสแล้ว ผู้ซื้อเห็นในห้องดีลทันที");
      setPassword("");
      onSent();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="ส่งรหัสเกมให้ผู้ซื้อ">
      <div className="space-y-4">
        {order.shipDeadline && (
          <p className="rounded-btn bg-warn-soft px-4 py-3 text-[14px] text-warn-text">
            ต้องส่งภายใน <Countdown to={order.shipDeadline} className="tabular font-bold" /> ไม่ส่ง = คืนเงินผู้ซื้ออัตโนมัติ
          </p>
        )}
        <label className="block">
          <span className="label">ไอดี / อีเมลที่ใช้ล็อกอิน</span>
          <input className="input" value={login} autoComplete="off" onChange={(e) => setLogin(e.target.value)} placeholder="เช่น riot id หรืออีเมล" />
        </label>
        <label className="block">
          <span className="label">รหัสผ่าน</span>
          <div className="relative">
            <input
              className="input pr-12"
              type={show ? "text" : "password"}
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label="แสดง/ซ่อนรหัสผ่าน" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-soft">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="label">ข้อมูลเพิ่มเติม (ไม่บังคับ)</span>
          <textarea className="textarea min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น อีเมลที่ผูก + รหัสอีเมล, วิธีปลดเบอร์, backup code" />
        </label>
        <p className="text-[13px] leading-relaxed text-muted">ข้อมูลถูกเข้ารหัส เห็นเฉพาะผู้ซื้อ (และแอดมินถ้ามีข้อพิพาท) — อย่าส่งรหัสทางแชท</p>
        <Button onClick={submit} loading={busy} disabled={!login.trim() || !password} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}>
          ยืนยันส่งรหัส
        </Button>
      </div>
    </Sheet>
  );
}
