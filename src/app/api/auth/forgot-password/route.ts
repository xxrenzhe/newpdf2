import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password reset is not available. Please sign in with Google." },
    { status: 410 }
  );
}
