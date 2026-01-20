import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, ensureCustomerForEmail, PRICES } from "@/lib/stripe";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/server/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`stripe-checkout:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const authSession = await getServerSession(authOptions).catch(() => null);
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: rateLimitHeaders(rl) });
  }

  try {
    const { plan } = await request.json();

    if (!plan || !["monthly", "annual"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    const priceId = plan === "annual" ? PRICES.annual : PRICES.monthly;
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      request.headers.get("origin") ||
      request.nextUrl.origin;

    const customer = await ensureCustomerForEmail(
      authSession.user.email,
      authSession.user.name ?? undefined
    );

    const checkoutSession = await createCheckoutSession({
      priceId,
      customerId: customer.id,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/plan`,
    });

    return NextResponse.json(
      { url: checkoutSession.url },
      { headers: { "Cache-Control": "no-store", ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers: rateLimitHeaders(rl) }
    );
  }
}
