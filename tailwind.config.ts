import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF8",
        surface: "#FFFFFF",
        line: "#E7E7E3",
        field: "#DCDCD6",
        soft: "#F1F1EE",
        ink: "#141414",
        muted: "#5F5F5A",
        accent: { DEFAULT: "#0E7A5A", dark: "#0A5C44", soft: "#E6F2ED" },
        warn: { DEFAULT: "#B4530A", text: "#8A4A06", soft: "#FDF1E3" },
        star: "#E8A317",
      },
      fontFamily: { sans: ["var(--font-plex)", '"IBM Plex Sans Thai"', "sans-serif"] },
      borderRadius: { card: "16px", btn: "12px", pill: "999px" },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,20,0.04), 0 4px 16px rgba(20,20,20,0.04)",
        lift: "0 8px 24px rgba(14,122,90,0.25)",
      },
      keyframes: {
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        ring: { "0%": { transform: "scale(1)", opacity: "0.55" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        scan: { "0%,100%": { top: "6%" }, "50%": { top: "88%" } },
      },
      animation: {
        shimmer: "shimmer 2.2s ease-in-out infinite",
        ring: "ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        scan: "scan 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
