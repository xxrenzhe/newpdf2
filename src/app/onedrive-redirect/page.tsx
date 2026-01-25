import Script from "next/script";

export const dynamic = "force-dynamic";

export default function OneDriveRedirectPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <Script src="https://js.live.net/v7.2/OneDrive.js" strategy="beforeInteractive" />
      <p className="text-sm text-gray-600">Completing OneDrive sign-in…</p>
    </main>
  );
}

