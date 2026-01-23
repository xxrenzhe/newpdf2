import { getStripeUser } from "@/lib/admin/stripeUsers";
import type Stripe from "stripe";
import Link from "next/link";
import { notFound } from "next/navigation";

function formatDateTime(seconds: number | undefined): string {
  if (!seconds) return "-";
  const d = new Date(seconds * 1000);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function formatSubPlan(sub: Stripe.Subscription): string {
  const item = sub.items.data[0];
  const price = item?.price;
  const recurring = price?.recurring;
  if (!recurring?.interval) return price?.id ?? "-";
  const count = recurring.interval_count && recurring.interval_count > 1 ? `${recurring.interval_count} ` : "";
  return `${count}${recurring.interval}`;
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const id = customerId;
  let data: Awaited<ReturnType<typeof getStripeUser>> | null = null;

  try {
    data = await getStripeUser(id);
  } catch {
    data = null;
  }

  if (!data) notFound();

  const { customer, subscriptions } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm">
        <div className="p-6 border-b border-[color:var(--brand-line)] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[color:var(--brand-ink)] truncate">{customer.email ?? customer.id}</h1>
            <p className="text-sm text-[color:var(--brand-muted)] mt-1">{customer.id}</p>
          </div>
          <Link href="/admin/users" className="text-sm text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)]">
            Back
          </Link>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[color:var(--brand-muted)]">Name</p>
            <p className="text-[color:var(--brand-ink)] font-medium">{customer.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-[color:var(--brand-muted)]">Email</p>
            <p className="text-[color:var(--brand-ink)] font-medium">{customer.email ?? "-"}</p>
          </div>
          <div>
            <p className="text-[color:var(--brand-muted)]">Created</p>
            <p className="text-[color:var(--brand-ink)] font-medium">{formatDateTime(customer.created)}</p>
          </div>
          <div>
            <p className="text-[color:var(--brand-muted)]">Delinquent</p>
            <p className="text-[color:var(--brand-ink)] font-medium">{customer.delinquent ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm">
        <div className="p-6 border-b border-[color:var(--brand-line)]">
          <h2 className="text-lg font-semibold text-[color:var(--brand-ink)]">Subscriptions</h2>
        </div>
        <div className="p-6 overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--brand-muted)]">
                <th className="py-2 pr-4 font-medium">Subscription</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Cancel at period end</th>
                <th className="py-2 pr-4 font-medium">Current period end</th>
                <th className="py-2 pr-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-t border-[color:var(--brand-line)]">
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{s.id}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{s.status}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{formatSubPlan(s)}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{s.cancel_at_period_end ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">
                    {formatDateTime(s.items.data[0]?.current_period_end)}
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{formatDateTime(s.created)}</td>
                </tr>
              ))}
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[color:var(--brand-muted)]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
