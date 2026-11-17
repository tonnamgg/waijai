import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center px-8 text-center">
      <SearchX className="h-14 w-14 text-muted" strokeWidth={1.4} />
      <h1 className="mt-4 text-[22px] font-bold">ไม่พบหน้านี้</h1>
      <p className="mt-1 text-[15px] text-muted">รายการอาจไม่มีอยู่ หรือคุณไม่ได้เป็นคู่สัญญาของรายการนี้</p>
      <div className="mt-6 w-full">
        <ButtonLink href="/">กลับหน้าหลัก</ButtonLink>
      </div>
    </main>
  );
}
