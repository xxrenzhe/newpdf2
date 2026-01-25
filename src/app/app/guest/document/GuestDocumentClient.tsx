"use client";

import { useSearchParams } from "next/navigation";
import UnifiedToolPage from "@/components/tools/UnifiedToolPage";

export default function GuestDocumentClient() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");
  const chosenTool = searchParams.get("chosenTool");

  return (
    <UnifiedToolPage
      isGuest={true}
      chosenTool={chosenTool}
      documentId={documentId}
    />
  );
}
