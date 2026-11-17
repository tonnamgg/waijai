"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print mt-6">
      <Button icon={<Printer className="h-5 w-5" />} onClick={() => window.print()}>
        พิมพ์ / บันทึกเป็น PDF
      </Button>
    </div>
  );
}
