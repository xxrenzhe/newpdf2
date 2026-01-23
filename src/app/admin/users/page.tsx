import { listStripeUsers, type StripeUserRow } from "@/lib/admin/stripeUsers";
import Link from "next/link";

function formatDateTime(seconds: number | undefined): string {
  if (!seconds) return "-";
  const d = new Date(seconds * 1000);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function formatPlan(row: StripeUserRow): string {
  const sub = row.subscription;
  if (!sub) return "-";
  if (!sub.interval) return sub.priceId ?? "-";
  const count = sub.intervalCount && sub.intervalCount > 1 ? `${sub.intervalCount} ` : "";
  return `${count}${sub.interval}`;
}

export default async function AdminUsersPage() {
  let rows: StripeUserRow[] = [];
  let error: string | null = null;

  try {
    rows = await listStripeUsers(100);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load users";
  }

  return (
    <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm">
      <div className="p-6 border-b border-[color:var(--brand-line)]">
        <h1 className="text-xl font-semibold text-[color:var(--brand-ink)]">Users</h1>
        <p className="text-sm text-[color:var(--brand-muted)] mt-1">Stripe customers + subscription summary</p>
      </div>

      {error ? (
        <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
          {error}
        </div>
      ) : (
        <div className="p-6 overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--brand-muted)]">
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Subscription</th>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Period end</th>
                <th className="py-2 pr-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customerId} className="border-t border-[color:var(--brand-line)]">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/users/${r.customerId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {r.customerId}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{r.email ?? "-"}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{r.name ?? "-"}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{r.subscription?.status ?? "-"}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{formatPlan(r)}</td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">
                    {formatDateTime(r.subscription?.currentPeriodEnd)}
                  </td>
                  <td className="py-3 pr-4 text-[color:var(--brand-ink)]">{formatDateTime(r.created)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[color:var(--brand-muted)]">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

