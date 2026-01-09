import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, PRICES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { plan, email } = await request.json();

    if (!plan || !["monthly", "annual"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const priceId = plan === "annual" ? PRICES.annual : PRICES.monthly;
    const origin = request.headers.get("origin") || "http://localhost:3001";

    const session = await createCheckoutSession({
      priceId,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/plan`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
