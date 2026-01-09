import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout session completed:", session.id);
      // Handle successful checkout - update user subscription in database
      break;
    }
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription created:", subscription.id);
      // Handle new subscription
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription updated:", subscription.id);
      // Handle subscription update
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", subscription.id);
      // Handle subscription cancellation
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Payment succeeded:", invoice.id);
      // Handle successful payment
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Payment failed:", invoice.id);
      // Handle failed payment
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
