"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useState } from "react";

export function StarRating({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center justify-center gap-4" role="radiogroup" aria-label="ให้คะแนนผู้ขาย" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown;
        return (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ดาว`}
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onClick={() => onChange?.(n)}
            whileHover={readOnly ? undefined : { scale: 1.15, rotate: -6 }}
            whileTap={readOnly ? undefined : { scale: 0.85 }}
            animate={value >= n ? { scale: [1, 1.35, 1], rotate: [0, 15, 0] } : { scale: 1 }}
            transition={{ duration: 0.35, delay: value >= n ? (n - 1) * 0.05 : 0 }}
            className="p-1 disabled:cursor-default"
          >
            <Star
              className="h-[44px] w-[44px] transition-colors duration-150"
              strokeWidth={1.6}
              fill={on ? "#E8A317" : "transparent"}
              color={on ? "#E8A317" : "#9C9C95"}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
