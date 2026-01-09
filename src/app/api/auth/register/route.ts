import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const user = await registerUser(email, password, name || email.split("@")[0]);

    return NextResponse.json({
      message: "User registered successfully",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
