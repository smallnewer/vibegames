import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "暮光河谷 · Three.js 地形实验",
  description: "旧版 MMORPG 风格的程序化地形、逆光高光与水面实验。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
