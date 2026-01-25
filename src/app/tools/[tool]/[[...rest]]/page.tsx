import UnifiedToolPage from "@/components/tools/UnifiedToolPage";
import { redirect } from "next/navigation";

export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string; rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tool: toolKey, rest } = await params;
  const qs = await searchParams;

  const uploadIdFromPath = rest?.[0] ?? null;
  const uploadIdFromQuery = typeof qs.uploadId === "string" ? qs.uploadId : null;
  const uploadId = uploadIdFromPath ?? uploadIdFromQuery;

  if (!uploadIdFromPath && uploadIdFromQuery) {
    redirect(`/tools/${encodeURIComponent(toolKey)}/${encodeURIComponent(uploadIdFromQuery)}`);
  }

  return <UnifiedToolPage toolKey={toolKey} uploadId={uploadId} />;
}

