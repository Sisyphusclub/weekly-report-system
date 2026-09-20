import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "市场部工作看板", template: "%s · 市场部工作看板" },
  description: "日报、周报与项目协作工作台",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-body-regular text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
