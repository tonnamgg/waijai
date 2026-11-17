"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  ArrowUp,
  BadgeCheck,
  Check,
  CircleSlash,
  Handshake,
  Hourglass,
  KeyRound,
  Link2,
  Lock,
  MessagesSquare,
  PackageCheck,
  PackageOpen,
  Scale,
  ShieldCheck,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { CopyButton } from "@/components/CopyButton";
import { formatTHB } from "@/lib/money";
import type { OrderDTO } from "@/lib/orders";
import {
  eventLines,
  flowSteps,
  ONLINE_WINDOW_MS,
  TYPING_WINDOW_MS,
  turnOf,
  type FlowStep,
  type RoomMessage,
  type RoomPresence,
  type SystemIcon,
} from "@/lib/room";
import { ACTIVE_STATUSES, type Role } from "@/lib/types";

// ---------- บทบาท / อวาตาร์ ----------

export type SenderRole = Role | "ADMIN";

export const ROLE_TONE: Record<SenderRole, { bg: string; text: string; soft: string; label: string }> = {
  BUYER: { bg: "bg-accent", text: "text-accent-dark", soft: "bg-accent-soft", label: "ผู้ซื้อ" },
  SELLER: { bg: "bg-[#2B4A73]", text: "text-[#2B4A73]", soft: "bg-[#E3EAF4]", label: "ผู้ขาย" },
  ADMIN: { bg: "bg-warn", text: "text-warn-text", soft: "bg-warn-soft", label: "แอดมิน" },
};

export function Avatar({ name, role, size = 44, online }: { name: string; role: SenderRole; size?: number; online?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className={clsx("flex h-full w-full items-center justify-center rounded-full font-bold text-white", ROLE_TONE[role].bg)}
        style={{ fontSize: Math.round(size * 0.4) }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      {online !== undefined && (
        <span className={clsx("absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-[2.5px] ring-surface", online ? "bg-[#22C55E]" : "bg-[#C9C9C3]")} />
      )}
    </span>
  );
}

function presenceText(p: RoomPresence | undefined, now: number) {
  if (!p) return { online: false, text: "ยังไม่เปิดห้อง" };
  const diff = now - new Date(p.seenAt).getTime();
  if (diff < ONLINE_WINDOW_MS) return { online: true, text: "อยู่ในห้องตอนนี้" };
  const min = Math.floor(diff / 60_000);
  if (min < 1) return { online: false, text: "เพิ่งออกจากห้อง" };
  if (min < 60) return { online: false, text: `เห็นล่าสุด ${min} นาทีที่แล้ว` };
  const h = Math.floor(min / 60);
  if (h < 24) return { online: false, text: `เห็นล่าสุด ${h} ชม.ที่แล้ว` };
  return { online: false, text: `เห็นล่าสุด ${Math.floor(h / 24)} วันที่แล้ว` };
}

// ---------- หัวห้อง: สองฝ่าย + flow + ตาใคร ----------

export function RoomHeader({ o, myRole, myId, presence, now }: { o: OrderDTO; myRole: Role | null; myId: string; presence: RoomPresence[]; now: number }) {
  const held = ACTIVE_STATUSES.includes(o.status);
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start px-3 pt-4">
        <PartyCol o={o} side="BUYER" myId={myId} presence={presence} now={now} />
        <Bridge held={held} amount={o.priceSatang + o.feeSatang} status={o.status} />
        <PartyCol o={o} side="SELLER" myId={myId} presence={presence} now={now} />
      </div>
      <FlowStepper steps={flowSteps(o)} />
      <div className="px-3 pb-3">
        <TurnLine o={o} myRole={myRole} />
      </div>
    </section>
  );
}

function PartyCol({ o, side, myId, presence, now }: { o: OrderDTO; side: Role; myId: string; presence: RoomPresence[]; now: number }) {
  const u = side === "BUYER" ? o.buyer : o.seller;
  const tone = ROLE_TONE[side];
  if (!u) {
    const handle = o.counterpartyHandle ? (o.counterpartyHandle.startsWith("@") ? o.counterpartyHandle : `@${o.counterpartyHandle}`) : null;
    return (
      <div className="flex w-[34%] flex-col items-center text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-dashed border-field text-[20px] font-bold text-muted">?</span>
        <p className="mt-1.5 max-w-full truncate text-[14px] font-semibold text-muted">{handle ?? `รอ${tone.label}`}</p>
        <span className={clsx("mt-1 rounded-pill px-2 py-0.5 text-[11px] font-bold", tone.soft, tone.text)}>{tone.label}</span>
        <p className="mt-0.5 text-[11px] text-muted">ยังไม่เข้าห้อง</p>
      </div>
    );
  }
  const isMe = u.id === myId;
  const pr = presenceText(
    presence.find((p) => p.userId === u.id),
    now,
  );
  return (
    <div className="flex w-[34%] flex-col items-center text-center">
      <Avatar name={u.displayName} role={side} size={52} online={isMe ? true : pr.online} />
      <p className="mt-1.5 flex max-w-full items-center gap-1 truncate text-[14px] font-semibold">
        <span className="truncate">{u.displayName}</span>
        {u.kycVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
      </p>
      <span className={clsx("mt-1 rounded-pill px-2 py-0.5 text-[11px] font-bold", tone.soft, tone.text)}>
        {tone.label}
        {isMe ? " · คุณ" : ""}
      </span>
      <p className="mt-0.5 text-[11px] text-muted" suppressHydrationWarning>
        {isMe ? `@${u.username}` : pr.text}
      </p>
    </div>
  );
}

function Bridge({ held, amount, status }: { held: boolean; amount: number; status: OrderDTO["status"] }) {
  const caption =
    held ? "ไว้ใจพักเงินไว้" : status === "RELEASED" ? "โอนให้ผู้ขายแล้ว" : status === "REFUNDED" ? "คืนผู้ซื้อแล้ว" : status === "CANCELLED" ? "ยกเลิกแล้ว" : "ยังไม่มีเงินพัก";
  return (
    <div className="flex flex-1 flex-col items-center pt-[10px]">
      <div className="relative flex w-full items-center">
        <span className="h-[2px] flex-1 rounded-full bg-line" />
        <span className={clsx("relative z-10 flex h-8 w-8 items-center justify-center rounded-full", held ? "bg-accent text-white" : "bg-soft text-muted")}>
          {held ? <Lock className="h-4 w-4" strokeWidth={2.4} /> : <ShieldCheck className="h-4 w-4" />}
        </span>
        <span className="h-[2px] flex-1 rounded-full bg-line" />
      </div>
      <p className={clsx("mt-2 text-[11px] font-semibold", held ? "text-accent-dark" : "text-muted")}>{caption}</p>
      {held && <p className="tabular text-[13px] font-bold">{formatTHB(amount)}</p>}
    </div>
  );
}

function FlowStepper({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="mt-3 flex items-start border-t border-line px-1 pt-3">
      {steps.map((s, i) => {
        const reached = s.state !== "todo";
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span className="absolute right-1/2 top-[11px] h-[2px] w-full overflow-hidden bg-line">
                <motion.span
                  className="block h-full origin-left bg-accent"
                  initial={false}
                  animate={{ scaleX: reached ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                />
              </span>
            )}
            <StepDot state={s.state} />
            <p className={clsx("mt-1.5 text-[12px] font-semibold", s.state === "todo" ? "text-muted" : s.state === "warn" ? "text-warn-text" : "text-ink")}>{s.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ state }: { state: FlowStep["state"] }) {
  return (
    <span className="relative z-10 flex h-6 w-6 items-center justify-center">
      {state === "current" && <span className="absolute inset-0 animate-ring rounded-full bg-accent/40" />}
      <motion.span
        layout
        className={clsx(
          "relative flex h-6 w-6 items-center justify-center rounded-full",
          (state === "done" || state === "current") && "bg-accent",
          state === "todo" && "border-[2.5px] border-[#D3D3CD] bg-surface",
          state === "warn" && "bg-warn",
          state === "halted" && "bg-muted",
        )}
      >
        {state === "done" && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.2} />}
        {state === "current" && <span className="h-2 w-2 rounded-full bg-surface" />}
        {state === "warn" && <Scale className="h-3 w-3 text-white" strokeWidth={2.6} />}
        {state === "halted" && <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </motion.span>
    </span>
  );
}

/** "ถึงตาคุณ" / "รอ @x ..." — ใช้ทั้งในหัวห้องและแถบล่าง */
export function TurnLine({ o, myRole, compact }: { o: OrderDTO; myRole: Role | null; compact?: boolean }) {
  const t = turnOf(o);
  const base = clsx("flex items-center gap-2.5 rounded-btn", compact ? "px-3.5 py-2.5 text-[14px]" : "px-3.5 py-3 text-[14px]");
  const countdown = t.deadline ? (
    <span className="ml-auto shrink-0 text-[12px]">
      เหลือ <Countdown to={t.deadline} className="tabular font-bold" />
    </span>
  ) : null;

  if (t.who === "NONE") {
    const done = o.status === "RELEASED";
    return (
      <div className={clsx(base, done ? "bg-accent-soft text-accent-dark" : "bg-soft text-ink")}>
        {done ? <BadgeCheck className="h-5 w-5 shrink-0" /> : o.status === "REFUNDED" ? <Undo2 className="h-5 w-5 shrink-0" /> : <CircleSlash className="h-5 w-5 shrink-0" />}
        <span className="font-semibold">{done ? "ดีลสำเร็จ · ผู้ขายได้รับเงินแล้ว" : o.status === "REFUNDED" ? "ดีลจบ · คืนเงินผู้ซื้อแล้ว" : "ดีลถูกยกเลิก"}</span>
      </div>
    );
  }
  if (t.who === "JOIN") {
    const missing: Role = o.buyer ? "SELLER" : "BUYER";
    const iAmCreator = myRole && myRole !== missing;
    return (
      <div className={clsx(base, "bg-warn-soft text-warn-text")}>
        <Link2 className="h-5 w-5 shrink-0" />
        <span>
          <b>รอ{ROLE_TONE[missing].label}เข้าห้อง</b>
          {iAmCreator ? " · ส่งลิงก์ให้อีกฝ่ายกดรับรายการ" : ""}
        </span>
      </div>
    );
  }
  if (t.who === "ADMIN") {
    return (
      <div className={clsx(base, "bg-warn-soft text-warn-text")}>
        <Scale className="h-5 w-5 shrink-0" />
        <span>
          <b>รอแอดมินตัดสิน</b> · {myRole === "SELLER" ? "ส่งคำชี้แจงได้ที่แท็บรายละเอียด" : "เงินยังพักอยู่กับไว้ใจ"}
        </span>
      </div>
    );
  }
  const mine = t.who === myRole;
  const actor = t.who === "BUYER" ? o.buyer : o.seller;
  if (mine)
    return (
      <div className={clsx(base, "bg-accent text-white")}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
        <span className="min-w-0">
          <b>ถึงตาคุณ</b> · {t.task}
        </span>
        {countdown}
      </div>
    );
  return (
    <div className={clsx(base, "bg-soft text-ink")}>
      <Hourglass className="h-4 w-4 shrink-0 text-muted" />
      <span className="min-w-0">
        <b>รอ {actor ? `@${actor.username}` : ROLE_TONE[t.who].label}</b> <span className="text-muted">· {t.task}</span>
      </span>
      {countdown && <span className="ml-auto shrink-0 text-[12px] text-muted">{countdown}</span>}
    </div>
  );
}

// ---------- แชท ----------

const SYS_ICON: Record<SystemIcon, typeof Lock> = {
  open: PackageOpen,
  join: Handshake,
  lock: Lock,
  truck: Truck,
  box: PackageCheck,
  check: BadgeCheck,
  scale: Scale,
  undo: Undo2,
  cancel: CircleSlash,
  key: KeyRound,
};

type People = { nameOf: (id: string) => string; handleOf: (id: string) => string; roleOf: (id: string) => SenderRole };

export function ChatFeed({
  o,
  messages,
  myId,
  people,
  presence,
  inviteLink,
}: {
  o: OrderDTO;
  messages: RoomMessage[];
  myId: string;
  people: People;
  presence: RoomPresence[];
  inviteLink: string | null;
}) {
  const sys = eventLines(o, (id) => (id === myId ? "คุณ" : people.handleOf(id)));
  type Item = ({ kind: "msg" } & RoomMessage) | ({ kind: "sys" } & (typeof sys)[number]);
  const items: Item[] = [...messages.map((m) => ({ kind: "msg" as const, ...m })), ...sys.map((s) => ({ kind: "sys" as const, ...s }))].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const others = presence.filter((p) => p.userId !== myId);
  const typingUser = others.find((p) => p.typingAt && Date.now() - new Date(p.typingAt).getTime() < TYPING_WINDOW_MS);
  const lastMine = [...messages].reverse().find((m) => m.senderId === myId && !m.pending);
  const readByOther = lastMine && others.some((p) => new Date(p.seenAt).getTime() >= new Date(lastMine.createdAt).getTime());

  // เลื่อนลงล่างสุดเมื่อมีของใหม่ (ถ้าผู้ใช้อยู่ใกล้ล่างอยู่แล้ว)
  const count = items.length + (typingUser ? 1 : 0);
  const first = useRef(true);
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 260;
    if (first.current || nearBottom) window.scrollTo({ top: document.body.scrollHeight, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [count]);

  return (
    <div className="space-y-2.5">
      <p className="mx-auto flex max-w-[300px] items-center justify-center gap-1.5 text-center text-[12px] leading-relaxed text-muted">
        <MessagesSquare className="h-3.5 w-3.5 shrink-0" /> แชทในห้องดีลถูกเก็บเป็นหลักฐาน ใช้ประกอบการตัดสินถ้ามีข้อพิพาท
      </p>
      <AnimatePresence initial={false}>
        {items.map((it, i) => {
          if (it.kind === "sys") return <SystemCard key={it.id} line={it} />;
          const prev = items[i - 1];
          const grouped = prev?.kind === "msg" && prev.senderId === it.senderId;
          const mine = it.senderId === myId;
          return (
            <Bubble
              key={it.id}
              m={it}
              mine={mine}
              grouped={grouped}
              name={people.nameOf(it.senderId)}
              role={people.roleOf(it.senderId)}
              receipt={lastMine?.id === it.id ? (readByOther ? "อ่านแล้ว" : "ส่งแล้ว") : null}
            />
          );
        })}
        {typingUser && <TypingBubble key="typing" name={people.nameOf(typingUser.userId)} role={people.roleOf(typingUser.userId)} />}
      </AnimatePresence>
      {inviteLink && <InviteCard link={inviteLink} missing={o.buyer ? "SELLER" : "BUYER"} />}
    </div>
  );
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

function Bubble({ m, mine, grouped, name, role, receipt }: { m: RoomMessage; mine: boolean; grouped: boolean; name: string; role: SenderRole; receipt: string | null }) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={clsx("flex items-end gap-2", mine ? "justify-end" : "justify-start", grouped && "-mt-1.5")}
    >
      {!mine && <span className="w-8 shrink-0">{!grouped && <Avatar name={name} role={role} size={32} />}</span>}
      <div className={clsx("flex max-w-[76%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && !grouped && (
          <span className="mb-0.5 ml-1 text-[12px] text-muted">
            {name} · <span className={ROLE_TONE[role].text}>{ROLE_TONE[role].label}</span>
          </span>
        )}
        <div
          className={clsx(
            "whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-relaxed",
            mine ? "rounded-[18px] rounded-br-[6px] bg-accent text-white" : clsx("rounded-[18px] rounded-bl-[6px] text-ink", role === "ADMIN" ? "bg-warn-soft" : "bg-surface border border-line"),
            m.pending && "opacity-60",
          )}
        >
          {m.body}
        </div>
        <span className="mx-1 mt-0.5 text-[11px] text-muted" suppressHydrationWarning>
          {m.pending ? "กำลังส่ง…" : hhmm(m.createdAt)}
          {receipt && !m.pending && ` · ${receipt}`}
        </span>
      </div>
    </motion.div>
  );
}

function TypingBubble({ name, role }: { name: string; role: SenderRole }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
      <Avatar name={name} role={role} size={32} />
      <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[6px] border border-line bg-surface px-4 py-3" aria-label={`${name} กำลังพิมพ์`}>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

function SystemCard({ line }: { line: ReturnType<typeof eventLines>[number] }) {
  const Icon = SYS_ICON[line.icon];
  return (
    <motion.div layout="position" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center py-1">
      <div
        className={clsx(
          "flex max-w-[92%] items-start gap-2.5 rounded-[14px] px-3.5 py-2.5 text-[13px]",
          line.tone === "accent" && "bg-accent-soft text-accent-dark",
          line.tone === "amber" && "bg-warn-soft text-warn-text",
          line.tone === "muted" && "bg-soft text-ink",
        )}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">{line.text}</p>
          {line.sub && <p className="text-[12px] opacity-80">{line.sub}</p>}
          <p className="text-[11px] opacity-60" suppressHydrationWarning>
            {hhmm(line.createdAt)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function InviteCard({ link, missing }: { link: string; missing: Role }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[16px] border border-dashed border-warn/50 bg-warn-soft p-4">
      <p className="flex items-center gap-2 text-[15px] font-bold text-warn-text">
        <Link2 className="h-4 w-4" /> ชวน{ROLE_TONE[missing].label}เข้าห้องดีล
      </p>
      <p className="mt-1 text-[13px] text-[#3E3E3A]">คัดลอกลิงก์ส่งทางแชท/โซเชียล พออีกฝ่ายเปิดลิงก์แล้วกดรับรายการ จะเข้ามาคุยในห้องนี้ได้ทันที</p>
      <div className="mt-2.5 flex items-center gap-2 rounded-btn bg-surface p-1.5 pl-3">
        <span className="flex-1 truncate text-[13px] text-ink" suppressHydrationWarning>
          {link}
        </span>
        <CopyButton text={link} />
      </div>
    </motion.div>
  );
}

// ---------- ช่องพิมพ์ ----------

export function Composer({ onSend, onTyping, quick }: { onSend: (text: string) => Promise<unknown>; onTyping: () => void; quick: string[] }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  async function submit(value = text) {
    const v = value.trim();
    if (!v) return;
    setText("");
    try {
      await onSend(v);
    } catch {
      setText(v); // ส่งไม่สำเร็จ คืนข้อความให้แก้/ส่งใหม่
    }
    ref.current?.focus();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  return (
    <div>
      <AnimatePresence initial={false}>
        {text === "" && quick.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
              {quick.map((q) => (
                <button key={q} type="button" onClick={() => submit(q)} className="h-8 shrink-0 rounded-pill border border-field bg-surface px-3 text-[13px] text-ink transition-colors hover:bg-soft">
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 rounded-[22px] border border-field bg-surface p-1.5 pl-4 transition-shadow focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10"
      >
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={1000}
          placeholder="พิมพ์ข้อความถึงอีกฝ่าย…"
          aria-label="ข้อความ"
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 outline-none placeholder:text-[#8A8A84]"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.88 }}
          disabled={!text.trim()}
          aria-label="ส่งข้อความ"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-35"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
        </motion.button>
      </form>
    </div>
  );
}

/** ข้อความลัดตามบทบาท/สถานะ */
export function quickReplies(o: OrderDTO, myRole: Role | null): string[] {
  if (o.kind === "GAME_ACCOUNT") {
    if (myRole === "BUYER") {
      if (o.status === "CREATED") return ["ขอดูภาพสกิน/คลังเพิ่ม", "ผูกเบอร์หรือ 2FA ไว้ไหม?", "จ่ายเข้าไว้ใจแล้วนะ"];
      if (o.status === "PAID_HELD") return ["ส่งรหัสได้เลย", "ปลดเบอร์/2FA ก่อนส่งด้วยนะ"];
      if (o.status === "DELIVERED") return ["ล็อกอินได้แล้ว กำลังตรวจ", "ขอรหัสยืนยันทางอีเมลหน่อย", "เปลี่ยนรหัสแล้ว ขอบคุณ"];
    }
    if (myRole === "SELLER") {
      if (o.status === "CREATED") return ["ไอดีพร้อมส่ง จ่ายเข้าไว้ใจได้เลย", "ปลดเบอร์/2FA ให้แล้ว", "มีภาพเพิ่มให้ดูได้"];
      if (o.status === "PAID_HELD") return ["กำลังส่งรหัสให้", "ถ้าขอรหัสยืนยันทักมาได้เลย"];
      if (o.status === "DELIVERED") return ["ล็อกอินได้ไหม?", "เปลี่ยนรหัสแล้วกดยืนยันด้วยนะ"];
    }
    return [];
  }
  if (myRole === "BUYER") {
    if (o.status === "CREATED") return ["ขอรูปสินค้าเพิ่มหน่อย", "สภาพเป็นยังไงบ้าง?", "จ่ายเข้าไว้ใจแล้วนะ"];
    if (o.status === "PAID_HELD") return ["จะส่งของวันไหน?", "ขอแพ็กกันกระแทกด้วยนะ", "ขอบคุณ"];
    if (o.status === "SHIPPED") return ["ได้รับเลขพัสดุแล้ว ขอบคุณ", "ของยังไม่ถึงเลย"];
    if (o.status === "DELIVERED") return ["ได้ของแล้ว กำลังตรวจ", "ของตรงปก ขอบคุณมาก"];
  }
  if (myRole === "SELLER") {
    if (o.status === "CREATED") return ["ของพร้อมส่ง จ่ายเข้าไว้ใจได้เลย", "มีรูปเพิ่มให้ดูได้", "สอบถามได้เลย"];
    if (o.status === "PAID_HELD") return ["ได้รับแจ้งชำระแล้ว", "จะส่งของพรุ่งนี้", "แพ็กของเรียบร้อยแล้ว"];
    if (o.status === "SHIPPED") return ["ส่งแล้ว ตามเลขพัสดุได้เลย", "ได้ของแล้วบอกด้วยนะ"];
    if (o.status === "DELIVERED") return ["ตรวจของแล้วกดยืนยันด้วยนะ", "มีปัญหาอะไรบอกได้เลย"];
  }
  return [];
}
