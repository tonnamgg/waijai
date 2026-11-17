"use client";

import { motion } from "framer-motion";
import { CirclePlus, House, List, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  { href: "/", label: "หน้าหลัก", icon: House },
  { href: "/orders", label: "รายการ", icon: List },
  { href: "/orders/new", label: "สร้าง", icon: CirclePlus },
  { href: "/account", label: "บัญชี", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  const activeHref = path === "/orders/new" ? "/orders/new" : path.startsWith("/orders") ? "/orders" : path.startsWith("/account") ? "/account" : path === "/" ? "/" : "";

  return (
    <>
      <div className="h-[96px]" />
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="flex h-[76px] items-stretch">
          {items.map(({ href, label, icon: Icon }) => {
            const active = activeHref === href;
            return (
              <li key={href} className="flex-1">
                <Link href={href} className="relative flex h-full flex-col items-center justify-center gap-1">
                  {active && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute top-0 h-[3px] w-10 rounded-b-full bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.span whileTap={{ scale: 0.85 }} animate={{ y: active ? -1 : 0 }}>
                    <Icon className={clsx("h-[26px] w-[26px] transition-colors", active ? "text-accent" : "text-muted")} strokeWidth={active ? 2.2 : 1.8} />
                  </motion.span>
                  <span className={clsx("text-[13px] transition-colors", active ? "font-bold text-accent" : "text-muted")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
