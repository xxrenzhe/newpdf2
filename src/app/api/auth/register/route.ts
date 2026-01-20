import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email/password sign-up is not supported. Please sign in with Google." },
    { status: 410 }
  );
}
