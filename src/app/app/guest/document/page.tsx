import { Suspense } from "react";
import GuestDocumentClient from "./GuestDocumentClient";

export default function GuestDocumentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <GuestDocumentClient />
    </Suspense>
  );
}

