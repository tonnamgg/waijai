"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, CircleCheck, Clock, Image as ImageIcon, Loader2, Lock, TriangleAlert, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Checklist } from "@/components/Checklist";
import { CountdownHM } from "@/components/Countdown";
import { MediaPicker } from "@/components/MediaPicker";
import { api, uploadFile, type Uploaded } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { Stagger, FadeUp } from "@/components/ui/motion";
import { formatTHB } from "@/lib/money";
import { DISPUTE_REASON_LABEL, type DisputeReason } from "@/lib/types";
import type { OrderDTO } from "@/lib/orders";
import { CredentialCard } from "@/components/game/GameParts";

export function InspectClient({ order: o }: { order: OrderDTO }) {
  const router = useRouter();
  const toast = useToast();
  const storageKey = `waijai:check:${o.id}`;
  const [checked, setChecked] = useState<boolean[]>(() => o.checklistItems.map(() => false));
  const [received, setReceived] = useState<Uploaded[]>(o.media.filter((m) => m.kind === "RECEIVED").map((m) => ({ url: m.url, mime: m.mime })));
  const [video, setVideo] = useState<Uploaded | null>(() => {
    const v = o.media.find((m) => m.kind === "UNBOXING_VIDEO");
    return v ? { url: v.url, mime: v.mime } : null;
  });
  const [uploading, setUploading] = useState<"photo" | "video" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const sellerPhoto = o.media.find((m) => m.kind === "LISTING" && m.mime.startsWith("image/"))?.url;
  const done = checked.filter(Boolean).length;
  const total = o.checklistItems.length;

  // จำเช็กลิสต์ไว้ในเครื่อง (กันหายตอนรีเฟรช)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length === total) setChecked(saved);
    } catch {}
  }, [storageKey, total]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {}
  }, [checked, storageKey]);

  async function upload(file: File | undefined, kind: "RECEIVED" | "UNBOXING_VIDEO") {
    if (!file) return;
    setUploading(kind === "RECEIVED" ? "photo" : "video");
    try {
      const res = await uploadFile(file, { orderId: o.id, kind });
      if (kind === "RECEIVED") setReceived((r) => [...r, res]);
      else setVideo(res);
      toast(kind === "RECEIVED" ? "แนบรูปของที่ได้รับแล้ว" : "แนบวิดีโอแกะกล่องแล้ว");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(null);
    }
  }

  async function release() {
    setBusy(true);
    try {
      await api(`/api/orders/${o.id}/confirm`);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      router.push(`/orders/${o.id}/done?celebrate=1`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  const latestReceived = received[received.length - 1];
  const isGame = o.kind === "GAME_ACCOUNT";

  return (
    <main className="pb-48">
      <TopBar title={isGame ? "ตรวจรหัสก่อนปล่อยเงิน" : "ตรวจของก่อนปล่อยเงิน"} back={`/orders/${o.id}`} />
      <Stagger className="space-y-5 px-5">
        {isGame && (
          <FadeUp>
            <CredentialCard o={o} viewer="BUYER" />
          </FadeUp>
        )}
        {o.inspectDeadline && (
          <FadeUp>
            <div className="flex gap-3 rounded-[16px] bg-warn-soft px-5 py-4 text-[16px] leading-relaxed text-warn-text">
              <motion.span animate={{ rotate: [0, 12, -12, 0] }} transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.6 }} className="mt-0.5 shrink-0">
                <Clock className="h-6 w-6" strokeWidth={2} />
              </motion.span>
              <p>
                <CountdownHM to={o.inspectDeadline} /> ถ้าไม่กดอะไร ระบบจะปล่อยเงินให้ผู้ขายอัตโนมัติ
              </p>
            </div>
          </FadeUp>
        )}

        {/* เทียบรูป */}
        <FadeUp>
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[16px] bg-[#EDEDEA]">
                {sellerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sellerPhoto} alt="รูปจากผู้ขาย" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-[#9C9C95]" strokeWidth={1.5} />
                )}
              </div>
              <figcaption className="mt-2 text-center text-[14px] text-muted">{isGame ? "ภาพจากผู้ขาย" : "รูปจากผู้ขาย"}</figcaption>
            </figure>
            <figure>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => photoInput.current?.click()}
                className={clsx(
                  "relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[16px] text-ink",
                  latestReceived ? "bg-soft" : "border-2 border-dashed border-[#BDBDB6] bg-surface hover:border-accent",
                )}
              >
                <AnimatePresence mode="wait">
                  {uploading === "photo" ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className="h-7 w-7 animate-spin text-accent" />
                    </motion.span>
                  ) : latestReceived ? (
                    <motion.img
                      key={latestReceived.url}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={latestReceived.url}
                      alt="ของที่ได้รับ"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <motion.span key="e" className="flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Camera className="h-7 w-7" strokeWidth={1.8} />
                      <span className="text-[15px]">{isGame ? "แนบภาพหน้าจอ" : "ถ่ายของที่ได้รับ"}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
                {received.length > 0 && (
                  <span className="absolute bottom-2 right-2 rounded-pill bg-black/60 px-2 py-0.5 text-[12px] text-white">
                    {received.length} รูป · เพิ่ม
                  </span>
                )}
              </motion.button>
              <figcaption className="mt-2 text-center text-[14px] text-muted">{isGame ? "หน้าจอหลังล็อกอิน" : "ของที่คุณได้รับ"}</figcaption>
              <input ref={photoInput} type="file" accept="image/*" capture={isGame ? undefined : "environment"} hidden onChange={(e) => { upload(e.target.files?.[0], "RECEIVED"); e.target.value = ""; }} />
            </figure>
          </div>
        </FadeUp>

        <FadeUp>
          <Checklist items={o.checklistItems} checked={checked} onToggle={(i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
        </FadeUp>

        <FadeUp className={isGame ? "hidden" : undefined}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => videoInput.current?.click()}
            className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface px-5 py-4 text-left transition-colors hover:bg-soft/60"
          >
            {uploading === "video" ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : video ? <CircleCheck className="h-6 w-6 text-accent" /> : <Video className="h-6 w-6" strokeWidth={1.8} />}
            <span className="flex-1 text-[16px]">{video ? "แนบวิดีโอแกะกล่องแล้ว" : "แนบวิดีโอแกะกล่อง"}</span>
            <span className="text-[14px] text-muted">{video ? "แตะเพื่อเปลี่ยน" : "ช่วยตอนมีข้อพิพาท"}</span>
          </motion.button>
          <input ref={videoInput} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { upload(e.target.files?.[0], "UNBOXING_VIDEO"); e.target.value = ""; }} />
        </FadeUp>
      </Stagger>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.35 }}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] space-y-3 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-6 pt-8"
      >
        <Button onClick={() => setConfirmOpen(true)}>{isGame ? "ล็อกอินได้ ตรงตามที่ตกลง · ปล่อยเงิน" : "ของตรงปก · ปล่อยเงินให้ผู้ขาย"}</Button>
        <Button variant="warn" icon={<TriangleAlert className="h-5 w-5" />} onClick={() => setDisputeOpen(true)}>
          {isGame ? "เข้าไม่ได้ / ไม่ตรง · ขอคืนเงิน" : "ไม่ตรงปก · ขอคืนเงิน"}
        </Button>
      </motion.div>

      {/* ยืนยันอีกครั้ง */}
      <Sheet open={confirmOpen} onClose={() => !busy && setConfirmOpen(false)} title="ยืนยันปล่อยเงิน?">
        <div className="rounded-[16px] bg-accent-soft p-5 text-center">
          <Lock className="mx-auto h-7 w-7 text-accent-dark" />
          <p className="mt-2 text-[15px] text-accent-dark">โอนให้ @{o.seller?.username}</p>
          <p className="tabular text-[32px] font-bold text-accent-dark">{formatTHB(o.priceSatang)}</p>
        </div>
        <AnimatePresence>
          {done < total && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex items-center gap-2 rounded-btn bg-warn-soft px-4 py-3 text-[14px] text-warn-text">
              <TriangleAlert className="h-4 w-4 shrink-0" /> คุณยังเช็กไม่ครบ ({done}/{total}) แน่ใจว่าตรวจครบแล้ว?
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">เมื่อยืนยันแล้ว ระบบจะโอนเงินให้ผู้ขายทันทีและย้อนกลับไม่ได้</p>
        <div className="mt-5 space-y-2.5">
          <Button loading={busy} onClick={release}>
            ยืนยัน ปล่อยเงินเลย
          </Button>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>
            กลับไปตรวจต่อ
          </Button>
        </div>
      </Sheet>

      <DisputeSheet
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        order={o}
        uncheckedItems={o.checklistItems.filter((_, i) => !checked[i])}
        hasExistingEvidence={received.length > 0 || !!video}
        onDone={() => {
          toast("ส่งเรื่องแล้ว เงินยังพักอยู่จนกว่าจะตรวจสอบเสร็จ");
          router.push(`/orders/${o.id}`);
          router.refresh();
        }}
      />
    </main>
  );
}

function DisputeSheet({
  open,
  onClose,
  order,
  uncheckedItems,
  hasExistingEvidence,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  order: OrderDTO;
  uncheckedItems: string[];
  hasExistingEvidence: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<DisputeReason>("NOT_AS_DESCRIBED");
  const [items, setItems] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [evidence, setEvidence] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setItems(uncheckedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (evidence.length === 0 && !hasExistingEvidence) return toast("ต้องแนบรูปหรือวิดีโอเป็นหลักฐานอย่างน้อย 1 ไฟล์", "error");
    setBusy(true);
    try {
      await api(`/api/orders/${order.id}/dispute`, { reason, detail, mismatchItems: items });
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const reasons: DisputeReason[] = order.kind === "GAME_ACCOUNT" ? ["NOT_AS_DESCRIBED", "OTHER"] : ["NOT_AS_DESCRIBED", "DAMAGED", "OTHER"];

  return (
    <Sheet open={open} onClose={onClose} title="ไม่ตรงปก · ขอคืนเงิน">
      <div className="space-y-4">
        <div>
          <span className="label">เหตุผล</span>
          <div className="space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={clsx("relative flex w-full items-center justify-between rounded-btn border px-4 py-3 text-left text-[15px]", reason === r ? "border-transparent" : "border-line bg-surface")}
              >
                {reason === r && <motion.span layoutId="reason" className="absolute inset-0 rounded-btn border-2 border-warn bg-warn-soft" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                <span className="relative font-medium">{DISPUTE_REASON_LABEL[r]}</span>
              </button>
            ))}
          </div>
        </div>
        {order.checklistItems.length > 0 && (
          <div>
            <span className="label">รายการที่ไม่ตรง</span>
            <div className="flex flex-wrap gap-2">
              {order.checklistItems.map((c) => {
                const on = items.includes(c);
                return (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setItems((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}
                    className={clsx("rounded-pill border px-3 py-1.5 text-[14px] transition-colors", on ? "border-warn bg-warn-soft font-semibold text-warn-text" : "border-line bg-surface text-muted")}
                  >
                    {c}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
        <label className="block">
          <span className="label">อธิบายปัญหา</span>
          <textarea className="textarea min-h-[100px]" value={detail} placeholder="เช่น ได้สีน้ำเงินแทนสีดำ มีรอยถลอกที่ก้านซ้าย" onChange={(e) => setDetail(e.target.value)} />
        </label>
        <div>
          <span className="label">
            หลักฐานรูป/วิดีโอ <span className="font-normal text-muted">{hasExistingEvidence ? "(แนบเพิ่มได้)" : "(บังคับ)"}</span>
          </span>
          <MediaPicker value={evidence} onChange={setEvidence} orderId={order.id} kind="DISPUTE_EVIDENCE" accept="image/*,video/*" addLabel="แนบ" />
        </div>
        <Button variant="warn" loading={busy} onClick={submit} icon={<TriangleAlert className="h-5 w-5" />}>
          ส่งเรื่องขอคืนเงิน
        </Button>
      </div>
    </Sheet>
  );
}
