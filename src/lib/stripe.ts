import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, { typescript: true });
  }
  return stripeSingleton;
}

// Price IDs - replace with your actual Stripe price IDs
export const PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || "price_annual",
};

// Product features
export const PLAN_FEATURES = [
  "Powerful PDF Editor",
  "Digital Signatures",
  "Workspace with File Manager",
  "Unlimited File Conversion",
  "Redaction Tool",
  "Drive, OneDrive & Dropbox integration",
  "OCR technology",
  "Page Manipulation",
  "No Software Installation Required",
  "Multiple Security Tools",
  "SSO Sign in",
  "Access to All Upcoming Features",
];

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });

  return session;
}

export async function createCustomer(email: string, name?: string) {
  const customer = await getStripe().customers.create({
    email,
    name,
  });

  return customer;
}

export async function ensureCustomerForEmail(email: string, name?: string) {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  const first = existing.data[0];
  if (first) return first;
  return createCustomer(email, name);
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  return subscription;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}
