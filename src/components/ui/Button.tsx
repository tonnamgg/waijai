"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "warn" | "secondary" | "ghost" | "dark";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] disabled:bg-accent/50",
  warn: "border-[1.5px] border-warn bg-surface text-warn-text hover:bg-warn-soft disabled:opacity-50",
  secondary: "border border-field bg-surface text-ink hover:bg-soft disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-soft disabled:opacity-50",
  dark: "bg-ink text-white hover:bg-black disabled:opacity-50",
};

type Common = {
  variant?: Variant;
  size?: "lg" | "md" | "sm";
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
};

const sizeCls = { lg: "h-[52px] px-6 text-[17px]", md: "h-11 px-5 text-[15px]", sm: "h-9 px-3.5 text-[14px]" };

export function Button({
  variant = "primary",
  size = "lg",
  loading,
  icon,
  block = true,
  className,
  children,
  disabled,
  ...props
}: Common & HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={clsx(
        "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-btn font-semibold transition-colors duration-200 disabled:cursor-not-allowed",
        sizeCls[size],
        block && "w-full",
        styles[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      <span>{children as React.ReactNode}</span>
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  icon,
  block = true,
  className,
  children,
}: Common & { href: string; className?: string; children: React.ReactNode }) {
  return (
    <MotionLink
      href={href}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={clsx(
        "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-btn font-semibold transition-colors duration-200",
        sizeCls[size],
        block && "w-full",
        styles[variant],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </MotionLink>
  );
}
