"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Plus, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";
import { uploadFile, type Uploaded } from "./ui/client-api";
import { useToast } from "./ui/Toast";

/** กริดเลือกรูป/วิดีโอ + อัปโหลดทันที (แสดงช่องว่างตามดีไซน์) */
export function MediaPicker({
  value,
  onChange,
  max = 4,
  orderId,
  kind,
  accept = "image/*",
  addLabel = "เพิ่มรูป",
  slots = 4,
}: {
  value: Uploaded[];
  onChange: (v: Uploaded[]) => void;
  max?: number;
  orderId?: string;
  kind?: string;
  accept?: string;
  addLabel?: string;
  slots?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const toast = useToast();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - value.length);
    setBusy(list.length);
    const out: Uploaded[] = [];
    for (const f of list) {
      try {
        out.push(await uploadFile(f, { orderId, kind }));
      } catch (e) {
        toast((e as Error).message, "error");
      }
      setBusy((b) => b - 1);
    }
    onChange([...value, ...out]);
    if (input.current) input.current.value = "";
  }

  const placeholders = Math.max(0, slots - 1 - value.length - busy);

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {value.length + busy < max && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          whileHover={{ borderColor: "#0E7A5A" }}
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-[#BDBDB6] bg-surface text-muted transition-colors"
        >
          <Plus className="h-6 w-6" strokeWidth={1.8} />
          <span className="text-[13px]">{addLabel}</span>
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {value.map((m, i) => (
          <motion.div
            key={m.url}
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="group relative aspect-square overflow-hidden rounded-[14px] bg-soft"
          >
            {m.mime.startsWith("video/") ? (
              <video src={m.url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            {m.mime.startsWith("video/") && <Video className="absolute bottom-1.5 left-1.5 h-4 w-4 text-white drop-shadow" />}
            {!orderId && (
              <button
                type="button"
                aria-label="ลบรูป"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <motion.div key={`busy-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex aspect-square items-center justify-center rounded-[14px] bg-soft">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </motion.div>
        ))}
      </AnimatePresence>
      {Array.from({ length: placeholders }).map((_, i) => (
        <div key={`ph-${i}`} className={clsx("flex aspect-square items-center justify-center rounded-[14px]", i < 2 ? "bg-[#EDEDEA]" : "border border-line bg-[#F7F7F5]")}>
          {i < 2 && <ImageIcon className="h-7 w-7 text-[#9C9C95]" strokeWidth={1.6} />}
        </div>
      ))}
      <input ref={input} type="file" accept={accept} multiple={max > 1} hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
