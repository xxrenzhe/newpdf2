import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buildSha =
    process.env.NEXT_PUBLIC_PDFEDITOR_BUILD_ID ||
    process.env.APP_BUILD_SHA ||
    process.env.GITHUB_SHA ||
    "dev";

  return NextResponse.json(
    { buildSha },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
