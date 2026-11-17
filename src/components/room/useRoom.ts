"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/client-api";
import type { RoomMessage, RoomSnapshot } from "@/lib/room";

const POLL_MS = 2_000;
const POLL_HIDDEN_MS = 8_000;

/**
 * สถานะสดของห้องดีล: poll ทุก 2 วิ (แท็บที่ซ่อนอยู่ 8 วิ)
 * - messages / presence อัปเดตในที่
 * - ถ้า version ของดีลเปลี่ยน (อีกฝ่ายจ่าย/ส่งของ/cron) → เรียก onDealChanged ให้หน้าโหลดข้อมูลใหม่
 */
export function useRoom(orderId: string, initial: RoomSnapshot, onDealChanged: () => void) {
  const [snap, setSnap] = useState(initial);
  const [pending, setPending] = useState<RoomMessage[]>([]);
  const version = useRef(initial.version);
  const lastKey = useRef(0);
  const changed = useRef(onDealChanged);
  changed.current = onDealChanged;

  const poll = useCallback(async () => {
    try {
      const next = await api<RoomSnapshot>(`/api/orders/${orderId}/room`, { typing: Date.now() - lastKey.current < 3_000 });
      setSnap(next);
      if (next.version !== version.current) {
        version.current = next.version;
        changed.current();
      }
    } catch {
      /* เน็ตหลุดชั่วคราว — รอบหน้าลองใหม่ */
    }
  }, [orderId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = async () => {
      await poll();
      if (alive) timer = setTimeout(loop, document.hidden ? POLL_HIDDEN_MS : POLL_MS);
    };
    timer = setTimeout(loop, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        loop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  const send = useCallback(
    async (body: string, myId: string) => {
      const temp: RoomMessage = { id: `tmp-${Date.now()}`, senderId: myId, body, createdAt: new Date().toISOString(), pending: true };
      setPending((p) => [...p, temp]);
      lastKey.current = 0;
      try {
        const saved = await api<RoomMessage>(`/api/orders/${orderId}/messages`, { body });
        setSnap((s) => (s.messages.some((m) => m.id === saved.id) ? s : { ...s, messages: [...s.messages, saved] }));
        return true;
      } catch (e) {
        throw e;
      } finally {
        setPending((p) => p.filter((m) => m.id !== temp.id));
      }
    },
    [orderId],
  );

  const markTyping = useCallback(() => {
    lastKey.current = Date.now();
  }, []);

  return { messages: [...snap.messages, ...pending], presence: snap.presence, send, markTyping, refreshNow: poll };
}

/** นาฬิกาที่เดินทุก n ms — ใช้คำนวณ "ออนไลน์ / เห็นล่าสุด" */
export function useNow(ms = 3_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
