import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // โหมดเดโมสองจอ (/duo) เปิดแอปผ่าน <username>.localhost — อนุญาตให้ dev server เสิร์ฟ asset/HMR ให้โดเมนเหล่านี้
  allowedDevOrigins: ["*.localhost"],
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
