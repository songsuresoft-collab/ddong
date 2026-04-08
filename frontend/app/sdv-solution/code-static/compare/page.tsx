import { Suspense } from "react";
import ComparePage from "@/components/code-static/compare/ComparePage";

export default function Page() {
  return (
    <Suspense fallback={<div className="empty-state"><div className="spinner" /></div>}>
      <ComparePage />
    </Suspense>
  );
}

