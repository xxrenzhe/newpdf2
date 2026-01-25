import CloudPickerClient from "./CloudPickerClient";

export const dynamic = "force-dynamic";

export default async function CloudPickerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const qs = await searchParams;
  const provider =
    typeof qs.provider === "string" && (qs.provider === "google-drive" || qs.provider === "dropbox" || qs.provider === "onedrive")
      ? qs.provider
      : "google-drive";
  const channel = typeof qs.channel === "string" ? qs.channel : "";
  const multiple = qs.multiple === "1" || qs.multiple === "true";

  return <CloudPickerClient provider={provider} channel={channel} multiple={multiple} />;
}

