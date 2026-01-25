import UnifiedToolPage from "@/components/tools/UnifiedToolPage";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string; slug?: string[] }>;
}) {
  const { documentId, slug } = await params;
  const chosenTool = slug?.[0] ?? "edit-pdf";

  return <UnifiedToolPage isGuest chosenTool={chosenTool} documentId={documentId} />;
}
