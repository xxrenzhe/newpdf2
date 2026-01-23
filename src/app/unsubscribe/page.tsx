"use client";

import Link from "@/components/AppLink";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-[color:var(--brand-cream)]">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--brand-ink)] mb-6">
              How to Cancel Your QwerPDF Subscription
            </h1>

            {/* Introduction */}
            <div className="mb-8">
              <p className="text-[color:var(--brand-muted)] mb-2">
                Thank you for visiting QwerPDF.com! We truly value your business and appreciate having you as our customer.
              </p>
              <p className="text-[color:var(--brand-muted)]">
                To get started, simply follow these three easy steps:
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-8 mb-12">
              {/* Step 1 */}
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--brand-ink)] mb-2">
                  1. Log into your QwerPDF account
                </h3>
                <p className="text-[color:var(--brand-muted)]">
                  <Link href="/app/sign-in" className="text-primary hover:underline">
                    Click here
                  </Link>{" "}
                  to access the Sign In page.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--brand-ink)] mb-2">
                  2. Once you are logged into your dashboard, access the settings in the top right corner of your screen.
                </h3>
                <p className="text-[color:var(--brand-muted)]">
                  From your settings, click on "Subscription". This will bring you to the appropriate page to cancel your account.
                </p>
              </div>

              {/* Step 3 */}
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--brand-ink)] mb-2">
                  3. Click «Cancel Plan»
                </h3>
                <p className="text-[color:var(--brand-muted)]">
                  Follow all the steps to cancel your account.
                </p>
              </div>
            </div>

            {/* Difficulties section */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-[color:var(--brand-ink)] mb-4">
                Difficulties signing into your account?
              </h2>
              <p className="text-[color:var(--brand-muted)] mb-4">
                If you have any trouble logging in, please try signing in with Google again.
              </p>
              <p className="text-[color:var(--brand-muted)]">
                If you still have issues, please{" "}
                <Link href="/en/contact-us" className="text-primary hover:underline">
                  Contact Us
                </Link>{" "}
                to confirm that your account is still active.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
