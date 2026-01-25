import { redirect } from "next/navigation";

export default async function GuestDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const qs = await searchParams;
  const documentId = typeof qs.documentId === "string" ? qs.documentId : "";
  const chosenTool = typeof qs.chosenTool === "string" ? qs.chosenTool : "";

  if (documentId) {
    if (chosenTool && chosenTool !== "edit-pdf") {
      redirect(`/edit/${encodeURIComponent(documentId)}/${encodeURIComponent(chosenTool)}`);
    }
    redirect(`/edit/${encodeURIComponent(documentId)}`);
  }

  redirect("/edit");
}
