"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div variants={fadeUp} className={className} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

/** ตัวเลขเงินวิ่งขึ้น (สตางค์ → "฿x,xxx") */
export function CountUp({ satang, className, duration = 1.1 }: { satang: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => "฿" + Math.round(v / 100).toLocaleString("en-US"));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, satang, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, satang, mv, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
