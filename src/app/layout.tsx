import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ไว้ใจ — ตัวกลางพักเงินซื้อขายออนไลน์",
  description: "จ่ายเงินเข้าตัวกลาง ได้ของตรงปกค่อยปล่อยเงินให้ผู้ขาย",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAF8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={plex.variable}>
      <body className="font-sans antialiased">
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <div className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden bg-bg sm:shadow-[0_0_0_1px_#E2E2DC,0_20px_60px_rgba(20,20,20,0.08)]">
              {children}
            </div>
          </ToastProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
