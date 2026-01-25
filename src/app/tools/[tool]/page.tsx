"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import UnifiedToolPage from "@/components/tools/UnifiedToolPage";

function ToolContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const toolKey = params.tool as string;
  const uploadId = searchParams.get("uploadId");

  return (
    <UnifiedToolPage
      isGuest={false}
      toolKey={toolKey}
      uploadId={uploadId}
    />
  );
}

// Loading fallback component
function ToolPageLoading() {
  return (
    <main className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[color:var(--brand-line)] mx-auto mb-6 animate-pulse" />
          <div className="h-10 w-48 bg-[color:var(--brand-line)] rounded mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-[color:var(--brand-line)] rounded mx-auto animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function ToolPage() {
  return (
    <Suspense fallback={<ToolPageLoading />}>
      <ToolContent />
    </Suspense>
  );
}
