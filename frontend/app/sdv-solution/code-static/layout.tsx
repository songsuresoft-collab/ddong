import type { Metadata } from "next";
import "@/styles/code-static/globals.css";
import Sidebar from "@/components/code-static/layout/Sidebar";

export const metadata: Metadata = {
  title: "FW Dashboard - Static Code Analysis",
  description: "Static Firmware Code Verification Dashboard",
};

export default function CodeStaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

