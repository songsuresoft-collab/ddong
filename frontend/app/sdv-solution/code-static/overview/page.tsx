import { Suspense } from "react";
import OverviewPage from "@/components/code-static/overview/OverviewPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="empty-state"><div className="spinner" /></div>}>
      <OverviewPage />
    </Suspense>
  );
}

