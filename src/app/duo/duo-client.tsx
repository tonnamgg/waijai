"use client";

import { motion } from "framer-motion";
import { ArrowLeftRight, ExternalLink, House, RotateCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ROLE_TONE } from "@/components/room/RoomParts";
import type { Role } from "@/lib/types";

type U = { username: string; displayName: string; role: string };

const GUIDE = [
  { who: "SELLER" as Role, text: "จอขวา: กด \"ลงขาย\" → ใส่สินค้า → คัดลอกลิงก์" },
  { who: "BUYER" as Role, text: "จอซ้าย: ไม่ต้องสร้างอะไร แค่วางลิงก์ที่หน้าแรก → รับรายการ" },
  { who: "BUYER" as Role, text: "ทั้งคู่อยู่ในห้องดีลเดียวกันแล้ว ลองแชทหากันได้เลย" },
  { who: "BUYER" as Role, text: "จอซ้าย: จ่ายเงินเข้าตัวกลาง (จอขวาจะเด้งแจ้งทันที)" },
  { who: "SELLER" as Role, text: "จอขวา: ส่งของแล้ว · ใส่เลขพัสดุ" },
  { who: "BUYER" as Role, text: "จอซ้าย: ได้รับของ → ตรวจเช็กลิสต์ → ปล่อยเงิน" },
];

export function DuoClient({ users, initial }: { users: U[]; initial: { buyer: string; seller: string; path: string } }) {
  const [buyer, setBuyer] = useState(initial.buyer);
  const [seller, setSeller] = useState(initial.seller);
  const [path, setPath] = useState(initial.path);
  const [nonce, setNonce] = useState(0);
  const [base, setBase] = useState<{ protocol: string; port: string } | null>(null);

  useEffect(() => {
    setBase({ protocol: window.location.protocol, port: window.location.port });
  }, []);

  // เก็บค่าที่เลือกไว้ใน URL (รีเฟรชแล้วยังเหมือนเดิม)
  useEffect(() => {
    const q = new URLSearchParams({ buyer, seller, path });
    window.history.replaceState(null, "", `/duo?${q}`);
  }, [buyer, seller, path]);

  // ?duoRole บอกจอนั้นว่าตั้งใจเป็นฝ่ายไหน → ฟอร์มสร้างรายการเลือกบทบาทให้ตรง
  const urlFor = (username: string, role: Role, p = path) =>
    base ? `${base.protocol}//${username}.localhost${base.port ? `:${base.port}` : ""}${p}${p.includes("?") ? "&" : "?"}duoRole=${role}` : "";

  return (
    <div className="fixed inset-0 z-[60] overflow-auto bg-[#E6E6E0]">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-[17px] font-bold leading-tight">โหมดสองจอ</p>
              <p className="text-[12px] text-muted">ผู้ซื้อกับผู้ขายเป็นคนละบัญชีจริง ใช้งานพร้อมกันได้</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <UserSelect label="ผู้ซื้อ" role="BUYER" value={buyer} onChange={setBuyer} users={users} />
            <button
              type="button"
              aria-label="สลับฝั่ง"
              onClick={() => {
                setBuyer(seller);
                setSeller(buyer);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-field bg-surface hover:bg-soft"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <UserSelect label="ผู้ขาย" role="SELLER" value={seller} onChange={setSeller} users={users} />
            <button
              type="button"
              onClick={() => {
                setPath("/");
                setNonce((n) => n + 1);
              }}
              className="flex h-9 items-center gap-1.5 rounded-btn border border-field bg-surface px-3 text-[14px] font-semibold hover:bg-soft"
            >
              <House className="h-4 w-4" /> หน้าแรกทั้งคู่
            </button>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="flex h-9 items-center gap-1.5 rounded-btn border border-field bg-surface px-3 text-[14px] font-semibold hover:bg-soft"
            >
              <RotateCw className="h-4 w-4" /> โหลดใหม่
            </button>
          </div>
        </div>
      </header>

      {buyer === seller && (
        <p className="mx-auto mt-3 max-w-[600px] rounded-btn bg-warn-soft px-4 py-2 text-center text-[14px] text-warn-text">ผู้ซื้อกับผู้ขายเป็นบัญชีเดียวกัน — เลือกคนละบัญชีเพื่อทดสอบการคุยกัน</p>
      )}

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-center gap-6 px-4 py-5">
        <Phone role="BUYER" user={users.find((u) => u.username === buyer)} src={urlFor(buyer, "BUYER")} newTab={urlFor(buyer, "BUYER")} k={`${buyer}-${nonce}`} />

        <aside className="order-last w-full max-w-[390px] xl:order-none xl:w-[260px]">
          <div className="card p-4">
            <p className="text-[15px] font-bold">ลองเล่นตามนี้</p>
            <ol className="mt-3 space-y-2.5">
              {GUIDE.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                  <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", ROLE_TONE[g.who].bg)}>{i + 1}</span>
                  <span>{g.text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              แต่ละจอเปิดผ่าน <code className="rounded bg-soft px-1">ชื่อผู้ใช้.localhost</code> เลยล็อกเป็นคนละบัญชี เปิดเป็นแท็บแยกก็ได้ด้วยปุ่ม <ExternalLink className="inline h-3 w-3" /> ใต้แต่ละจอ
            </p>
          </div>
        </aside>

        <Phone role="SELLER" user={users.find((u) => u.username === seller)} src={urlFor(seller, "SELLER")} newTab={urlFor(seller, "SELLER")} k={`${seller}-${nonce}`} />
      </div>
    </div>
  );
}

function UserSelect({ label, role, value, onChange, users }: { label: string; role: Role; value: string; onChange: (v: string) => void; users: U[] }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-btn border border-field bg-surface pl-2.5 pr-1 text-[14px]">
      <span className={clsx("h-2.5 w-2.5 rounded-full", ROLE_TONE[role].bg)} />
      <span className="font-semibold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-[8px] bg-soft px-2 text-[14px] outline-none">
        {users
          .filter((u) => u.role !== "admin")
          .map((u) => (
            <option key={u.username} value={u.username}>
              {u.displayName} (@{u.username})
            </option>
          ))}
      </select>
    </label>
  );
}

function Phone({ role, user, src, newTab, k }: { role: Role; user?: U; src: string; newTab: string; k: string }) {
  const tone = ROLE_TONE[role];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex w-[390px] max-w-full flex-col items-center">
      <div className="mb-2 flex w-full items-center gap-2 px-1">
        <span className={clsx("rounded-pill px-2.5 py-1 text-[12px] font-bold text-white", tone.bg)}>{tone.label}</span>
        <span className="truncate text-[15px] font-semibold">
          {user?.displayName ?? "?"} <span className="text-muted">@{user?.username}</span>
        </span>
        {newTab && (
          <a href={newTab} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[13px] text-accent hover:underline">
            แท็บแยก <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <div className={clsx("w-full overflow-hidden rounded-[34px] border-[6px] bg-bg shadow-[0_20px_50px_rgba(20,20,20,0.18)]", role === "BUYER" ? "border-accent" : "border-[#2B4A73]")}>
        {src ? (
          <iframe
            key={k}
            src={src}
            title={`จอ${tone.label}`}
            allow="clipboard-read; clipboard-write"
            className="block h-[min(800px,calc(100dvh-150px))] min-h-[560px] w-full bg-bg"
          />
        ) : (
          <div className="h-[min(800px,calc(100dvh-150px))] min-h-[560px]" />
        )}
      </div>
    </motion.div>
  );
}
