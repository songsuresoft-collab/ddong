import type { Metadata } from "next";
import "./globals.css";
import TopNavBar from "./components/TopNavBar";

export const metadata: Metadata = {
  title: "SURE-Intelligence Hub | SDV시스템실 AI 비서",
  description: "SDV시스템실 실시간 AI 인텔리전스 대시보드 - NotebookLM 기반 데이터 분석",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true} style={{ minHeight: '100vh', backgroundColor: '#f7f9ff', margin: 0 }}>
        <TopNavBar />
        <div style={{ width: '100%' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
