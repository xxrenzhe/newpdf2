import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export type SubscriptionSummary = {
  status: Stripe.Subscription.Status;
  priceId?: string;
  interval?: Stripe.Price.Recurring.Interval;
  intervalCount?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
};

export type StripeUserRow = {
  customerId: string;
  email: string | null;
  name: string | null;
  created: number;
  subscription?: SubscriptionSummary;
};

function summarizeSubscription(sub: Stripe.Subscription): SubscriptionSummary {
  const item = sub.items.data[0];
  const price = item?.price;
  const recurring = price?.recurring;
  return {
    status: sub.status,
    priceId: price?.id,
    interval: recurring?.interval,
    intervalCount: recurring?.interval_count,
    currentPeriodEnd: item?.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

function subscriptionRank(status: Stripe.Subscription.Status): number {
  if (status === "active") return 4;
  if (status === "trialing") return 3;
  if (status === "past_due") return 2;
  if (status === "unpaid") return 1;
  return 0;
}

function pickBestSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | undefined {
  return subs
    .slice()
    .sort((a, b) => {
      const rank = subscriptionRank(b.status) - subscriptionRank(a.status);
      if (rank !== 0) return rank;
      return (b.created ?? 0) - (a.created ?? 0);
    })[0];
}

export async function listStripeUsers(limit = 100): Promise<StripeUserRow[]> {
  const stripe = getStripe();

  const [customersRes, subsRes] = await Promise.all([
    stripe.customers.list({ limit: Math.min(100, Math.max(1, limit)) }),
    stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.items.data.price", "data.customer"],
    }),
  ]);

  const subsByCustomerId = new Map<string, Stripe.Subscription[]>();
  for (const sub of subsRes.data) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as Stripe.Customer).id;
    const list = subsByCustomerId.get(customerId) ?? [];
    list.push(sub);
    subsByCustomerId.set(customerId, list);
  }

  const rows: StripeUserRow[] = [];
  for (const c of customersRes.data) {
    if ("deleted" in c && c.deleted) continue;
    const customer = c as Stripe.Customer;
    const subs = subsByCustomerId.get(customer.id) ?? [];
    const best = pickBestSubscription(subs);
    rows.push({
      customerId: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      created: customer.created ?? 0,
      subscription: best ? summarizeSubscription(best) : undefined,
    });
  }

  rows.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  return rows;
}

export async function getStripeUser(customerId: string): Promise<{
  customer: Stripe.Customer;
  subscriptions: Stripe.Subscription[];
} | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;

  const subsRes = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  return { customer: customer as Stripe.Customer, subscriptions: subsRes.data };
}
