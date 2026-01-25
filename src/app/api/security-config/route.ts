import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAllowedDomains(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);
}

export async function GET() {
  const allowedDomains = parseAllowedDomains(process.env["NEXT_PUBLIC_ALLOWED_DOMAINS"]);

  return NextResponse.json(
    { allowedDomains },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

