"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, KeyRound, Link2, ListChecks, Share2, Truck, Wallet } from "lucide-react";
import { config } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readDuoRole } from "@/components/DuoRoleCapture";
import clsx from "clsx";
import { TopBar } from "@/components/ui/TopBar";
import { MediaPicker } from "@/components/MediaPicker";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CopyButton } from "@/components/CopyButton";
import { api, type Uploaded } from "@/components/ui/client-api";
import { useToast } from "@/components/ui/Toast";
import { bahtToSatang, calcFee, formatTHB } from "@/lib/money";
import { publicOrigin } from "@/lib/room";
import { GAME_BASE_CHECKS, GAMES, gameById } from "@/lib/games";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Created = { id: string; shareUrl: string; code: string };

function parseLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

const digital = { deliverHours: config.DIGITAL_DELIVER_HOURS, inspectHours: config.DIGITAL_INSPECT_HOURS };

export function NewOrderForm({ shipDays, inspectHours }: { shipDays: number; inspectHours: number }) {
  const router = useRouter();
  const toast = useToast();
  // ผู้ขายเป็นคนเปิดดีลเสมอ — ผู้ซื้อแค่วางลิงก์ที่ได้รับ
  const [duoBuyerScreen, setDuoBuyerScreen] = useState(false);
  useEffect(() => setDuoBuyerScreen(readDuoRole() === "BUYER"), []);
  const [kind, setKind] = useState<"PHYSICAL" | "GAME_ACCOUNT">("PHYSICAL");
  const [game, setGame] = useState<string>("");
  const [rank, setRank] = useState("");
  const [region, setRegion] = useState("");
  const isGame = kind === "GAME_ACCOUNT";
  const g = gameById(game);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [specText, setSpecText] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const checklist = useMemo(() => parseLines(specText), [specText]);
  const priceSatang = useMemo(() => {
    try {
      return price ? bahtToSatang(price) : 0;
    } catch {
      return 0;
    }
  }, [price]);
  const fee = priceSatang > 0 ? calcFee(priceSatang) : 0;

  function formatPriceOnBlur() {
    if (!priceSatang) return;
    setPrice((priceSatang / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  async function submit() {
    const errs: Record<string, boolean> = {
      game: isGame && !game,
      title: !title.trim(),
      price: priceSatang < 100,
      specText: !specText.trim(),
      photos: photos.length === 0,
    };
    setErrors(errs);
    const firstErr = Object.entries(errs).find(([, v]) => v)?.[0];
    if (firstErr) {
      const msg: Record<string, string> = {
        game: "กรุณาเลือกเกม",
        title: "กรุณาใส่ชื่อสินค้า",
        price: "กรุณาใส่ราคาให้ถูกต้อง (อย่างน้อย ฿1)",
        specText: "กรุณาใส่รายละเอียดที่ต้องตรงปก",
        photos: isGame ? "ใส่ภาพหน้าจอบัญชีอย่างน้อย 1 รูป" : "ผู้ขายต้องใส่รูปสินค้าจริงอย่างน้อย 1 รูป",
      };
      toast(msg[firstErr], "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api<Created>("/api/orders", {
        role: "SELLER",
        title,
        price: price.replace(/,/g, ""),
        counterparty,
        specText,
        photoUrls: photos.map((p) => p.url),
        kind,
        ...(isGame ? { game, rank, region } : {}),
      });
      setCreated(res);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const fullLink = created ? `${publicOrigin()}${created.shareUrl}` : "";

  return (
    <main className="pb-32">
      <TopBar title="ลงขายสินค้า" back="/" />
      <div className="space-y-5 px-5">
        {duoBuyerScreen && (
          <p className="rounded-btn bg-warn-soft px-4 py-3 text-[14px] leading-relaxed text-warn-text">
            จอนี้คือ<b>ผู้ซื้อ</b> — ผู้ซื้อไม่ต้องสร้างรายการ ให้รอลิงก์จากผู้ขาย แล้ววางที่หน้าแรก
          </p>
        )}
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: "PHYSICAL", label: "สินค้าทั่วไป" },
            { value: "GAME_ACCOUNT", label: "รหัสเกม" },
          ]}
        />
        <p className="-mt-2 flex items-start gap-2 rounded-btn bg-soft px-4 py-3 text-[14px] leading-relaxed text-[#3E3E3A]">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            ส่งลิงก์ให้ผู้ซื้อ · <b>ผู้ซื้อแค่เปิดลิงก์แล้วโอนเงิน</b>เข้าตัวกลาง
            {isGame ? " คุณส่งไอดี/รหัสผ่านในห้องดีล (เข้ารหัสไว้) ได้เงินเมื่อผู้ซื้อล็อกอินตรวจแล้วยืนยัน" : " คุณส่งของ แล้วได้เงินเมื่อผู้ซื้อยืนยันว่าตรงปก"}
          </span>
        </p>

        <AnimatePresence initial={false}>
          {isGame && (
            <motion.section
              key="game"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div>
                <span className={clsx("label", errors.game && "text-warn-text")}>เกม</span>
                <div className="grid grid-cols-3 gap-2">
                  {GAMES.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => { setGame(x.id); setErrors((e) => ({ ...e, game: false })); }}
                      className={clsx(
                        "flex h-11 items-center gap-2 rounded-btn border px-2.5 text-left text-[13px] font-semibold transition-colors",
                        game === x.id ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-soft",
                      )}
                    >
                      <span className={clsx("shrink-0 text-[11px] font-bold", game === x.id ? "text-white/70" : "text-muted")}>{x.short}</span>
                      <span className="truncate">{x.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="แรงก์ / เลเวล">
                  <input className="input" value={rank} maxLength={60} placeholder={g?.rankHint ?? "เช่น Diamond 2"} onChange={(e) => setRank(e.target.value)} />
                </Field>
                <Field label="เซิร์ฟเวอร์">
                  <input className="input" value={region} maxLength={30} placeholder={g?.regionHint ?? "เช่น TH"} onChange={(e) => setRegion(e.target.value)} />
                </Field>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <motion.section animate={errors.photos ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
          <p className="mb-2.5 text-[15px]">
            <b className="font-semibold">{isGame ? "ภาพหน้าจอบัญชี" : "รูปสินค้าจริง"}</b>
            <span className="text-muted">{isGame ? " · หน้าโปรไฟล์ แรงก์ สกิน/ตัวละคร (อย่างน้อย 1 รูป)" : " · ใช้เทียบตอนรับของ (อย่างน้อย 1 รูป)"}</span>
          </p>
          <MediaPicker value={photos} onChange={(v) => { setPhotos(v); setErrors((e) => ({ ...e, photos: false })); }} max={4} />
        </motion.section>

        <Field label="ชื่อสินค้า" error={errors.title}>
          <input
            className={clsx("input", errors.title && "border-warn")}
            value={title}
            maxLength={120}
            placeholder={isGame ? `เช่น ไอดี ${g?.name ?? "Valorant"} ${rank || "แรงก์สูง"} สกินเยอะ` : "เช่น หูฟังไร้สาย สีดำ"}
            onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: false })); }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคา (บาท)" error={errors.price}>
            <input
              className={clsx("input tabular", errors.price && "border-warn")}
              value={price}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(e) => { setPrice(e.target.value.replace(/[^\d.,]/g, "")); setErrors((x) => ({ ...x, price: false })); }}
              onBlur={formatPriceOnBlur}
            />
          </Field>
          <Field label="ผู้ซื้อ (ไม่บังคับ)">
            <input className="input" value={counterparty} maxLength={50} placeholder="@ชื่อผู้ใช้ / เบอร์" onChange={(e) => setCounterparty(e.target.value)} />
          </Field>
        </div>

        <AnimatePresence>
          {priceSatang > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between rounded-btn bg-accent-soft px-4 py-3 text-[14px] text-accent-dark">
                <span>ผู้ซื้อจ่าย (รวมค่าบริการตัวกลาง {formatTHB(fee)})</span>
                <motion.b key={priceSatang} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="tabular text-[16px]">
                  {formatTHB(priceSatang + fee)}
                </motion.b>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="รายละเอียดที่ต้องตรงปก" error={errors.specText}>
          <textarea
            className={clsx("textarea min-h-[120px]", errors.specText && "border-warn")}
            value={specText}
            placeholder={
              isGame
                ? "แรงก์ เลเวล สกิน/ตัวละครที่มี ไอเทมเด่น\nพิมพ์บรรทัดละ 1 ข้อ — ผู้ซื้อจะล็อกอินตรวจตามนี้"
                : "สี ขนาด รุ่น สภาพ ตำหนิ อุปกรณ์\nพิมพ์บรรทัดละ 1 ข้อ — จะกลายเป็นเช็กลิสต์ตอนรับของ"
            }
            onChange={(e) => { setSpecText(e.target.value); setErrors((x) => ({ ...x, specText: false })); }}
          />
        </Field>

        <AnimatePresence>
          {(checklist.length > 0 || isGame) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mt-2 overflow-hidden">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                <ListChecks className="h-4 w-4" /> เช็กลิสต์ที่ผู้ซื้อจะใช้ตรวจ ({checklist.length + (isGame ? GAME_BASE_CHECKS.length : 0)})
              </p>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {[...checklist, ...(isGame ? GAME_BASE_CHECKS : [])].map((c, i) => (
                    <motion.span
                      key={c + i}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface px-3 py-1 text-[13px] text-ink"
                    >
                      <Check className="h-3.5 w-3.5 text-accent" strokeWidth={3} /> {c}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 rounded-[16px] bg-soft px-5 py-4">
          <p className="flex items-center gap-3 text-[15px] text-[#3E3E3A]">
            {isGame ? <KeyRound className="h-[22px] w-[22px] shrink-0 text-accent" strokeWidth={1.9} /> : <Truck className="h-[22px] w-[22px] shrink-0 text-accent" strokeWidth={1.9} />}
            {isGame ? `ผู้ขายต้องส่งรหัสภายใน ${digital.deliverHours} ชม. ไม่ส่ง = คืนเงินอัตโนมัติ` : `ผู้ขายต้องส่งภายใน ${shipDays} วัน ไม่ส่ง = คืนเงินอัตโนมัติ`}
          </p>
          <p className="flex items-center gap-3 text-[15px] text-[#3E3E3A]">
            <Clock className="h-[22px] w-[22px] shrink-0 text-accent" strokeWidth={1.9} />
            {isGame ? `ผู้ซื้อตรวจรหัสภายใน ${digital.inspectHours} ชม. หลังได้รับ` : `ผู้ซื้อตรวจของภายใน ${inspectHours} ชม. หลังของถึง`}
          </p>
          {isGame && (
            <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              บางเกมห้ามซื้อขายบัญชีในข้อตกลงผู้ใช้ และบัญชีอาจถูกระงับได้ ไว้ใจคุ้มครองการส่งมอบตามที่ตกลงในดีลเท่านั้น
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-6 pt-6">
        <Button onClick={submit} loading={busy} icon={<Link2 className="h-5 w-5" strokeWidth={2.2} />}>
          สร้างลิงก์ส่งให้ผู้ซื้อ
        </Button>
      </div>

      <Sheet open={!!created} onClose={() => created && router.push(`/orders/${created.id}`)}>
        {created && (
          <div className="pb-2 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent"
            >
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </motion.div>
            <h2 className="mt-4 text-[22px] font-bold">สร้างรายการแล้ว</h2>
            <p className="mt-1 text-[15px] text-muted">
              ส่งลิงก์นี้ให้ผู้ซื้อ · ผู้ซื้อวางลิงก์ที่หน้าแรกหรือเปิดลิงก์ แล้วกดรับรายการ · เลขรายการ {created.code}
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-btn bg-soft p-2 pl-4 text-left">
              <span className="flex-1 truncate text-[15px] font-medium text-ink">{fullLink}</span>
              <CopyButton text={fullLink} />
            </div>
            <div className="mt-4 space-y-2.5">
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  variant="secondary"
                  icon={<Share2 className="h-5 w-5" />}
                  onClick={() => navigator.share({ title: "ไว้ใจ — รายการซื้อขาย", text: `${title} ${formatTHB(priceSatang)}`, url: fullLink }).catch(() => {})}
                >
                  แชร์ลิงก์
                </Button>
              )}
              <Button onClick={() => router.push(`/orders/${created.id}`)}>ไปที่รายการ</Button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <motion.label className="block" animate={error ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
      <span className={clsx("label", error && "text-warn-text")}>{label}</span>
      {children}
    </motion.label>
  );
}
