import { Suspense } from "react";
import HotspotPage from "@/components/code-static/hotspot/HotspotPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="empty-state"><div className="spinner" /></div>}>
      <HotspotPage />
    </Suspense>
  );
}

