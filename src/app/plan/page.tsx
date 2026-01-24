"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/components/LanguageProvider";

const features = [
  { icon: "/assets/same-assets/1797688836.svg", titleKey: "planFeatureEditor", title: "Powerful PDF Editor" },
  { icon: "/assets/same-assets/2537515307.svg", titleKey: "planFeatureSignatures", title: "Digital Signatures", isNew: true },
  { icon: "/assets/same-assets/1990291496.svg", titleKey: "planFeatureWorkspace", title: "Workspace", subtitleKey: "planFeatureWorkspaceSubtitle", subtitle: "with File Manager" },
  { icon: "/assets/same-assets/3612369820.svg", titleKey: "planFeatureConversion", title: "Unlimited File Conversion" },
  { icon: "/assets/same-assets/867393456.svg", titleKey: "planFeatureRedaction", title: "Redaction Tool", isNew: true },
  { icon: "/assets/same-assets/3533335575.svg", titleKey: "planFeatureIntegrations", title: "Drive, OneDrive", subtitleKey: "planFeatureIntegrationsSubtitle", subtitle: "& DropBox integration" },
  { icon: "/assets/same-assets/3216288370.svg", titleKey: "planFeatureOcr", title: "OCR technology" },
  { icon: "/assets/same-assets/1530033771.svg", titleKey: "planFeatureManipulation", title: "Page Manipulation", isNew: true },
  { icon: "/assets/same-assets/2231875426.svg", titleKey: "planFeatureNoSoftware", title: "No Software", subtitleKey: "planFeatureNoSoftwareSubtitle", subtitle: "Installation Required" },
  { icon: "/assets/same-assets/4206478627.svg", titleKey: "planFeatureSecurity", title: "Multiple Security Tools" },
  { icon: "/assets/same-assets/1702208235.svg", titleKey: "planFeatureSso", title: "SSO Sign in", isNew: true },
  { icon: "/assets/same-assets/981624432.svg", titleKey: "planFeatureUpcoming", title: "Access to All Upcoming", subtitleKey: "planFeatureUpcomingSubtitle", subtitle: "Features" },
];

const brands = [
  "/assets/same-assets/3959512356.png",
  "/assets/same-assets/2364094864.png",
  "/assets/same-assets/2448600377.png",
  "/assets/same-assets/2983692322.png",
  "/assets/same-assets/2317977816.png",
  "/assets/same-assets/3923762797.png",
  "/assets/same-assets/3953556544.png",
  "/assets/same-assets/2908841443.png",
];

const faqItems = [
  { questionKey: "planFaq1Q", question: "What are my payment options?", answerKey: "planFaq1A", answer: "We accept all major credit cards, PayPal, and other payment methods depending on your region." },
  { questionKey: "planFaq2Q", question: "Why are certain websites offering PDF editing features for free?", answerKey: "planFaq2A", answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks." },
  { questionKey: "planFaq3Q", question: "Is QwerPDF safe to use?", answerKey: "planFaq3A", answer: "Yes, QwerPDF uses industry-standard encryption and security measures to protect your documents and personal information." },
  { questionKey: "planFaq4Q", question: "Can I change my plan?", answerKey: "planFaq4A", answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings." },
  { questionKey: "planFaq5Q", question: "What will happen if I cancel my subscription?", answerKey: "planFaq5A", answer: "You will continue to have access to premium features until the end of your billing period." },
  { questionKey: "planFaq6Q", question: "How can I cancel my subscription?", answerKey: "planFaq6A", answer: "You can cancel your subscription from your account settings under the Subscription section." },
  { questionKey: "planFaq7Q", question: "Will my subscription renew automatically?", answerKey: "planFaq7A", answer: "Yes, subscriptions renew automatically unless you cancel before the renewal date." },
];

export default function PlanPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const handleCheckout = async () => {
    if (!session) {
      router.push("/app/sign-in");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: isAnnual ? "annual" : "monthly",
          email: session.user?.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(t("checkoutCreateFailed", "Unable to create checkout session. Please try again."));
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(t("checkoutError", "An error occurred. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--brand-cream)]">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-10">
            {t("plansAndPricingLeft", "Plans")} <span className="text-primary">&</span>{" "}
            {t("plansAndPricingRight", "Pricing")}
          </h1>

          {/* Pricing Cards */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Annual Plan */}
              <button
                onClick={() => setIsAnnual(true)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  isAnnual
                    ? "border-primary bg-white shadow-lg"
                    : "border-[color:var(--brand-line)] bg-white hover:border-[color:var(--brand-line)]"
                }`}
              >
                {isAnnual && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-medium px-3 py-1 rounded-full">
                    {t("save60", "Save 60%")}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-peach)] flex items-center justify-center">
                    <img src="/assets/same-assets/2242939468.svg" alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-bold text-[color:var(--brand-ink)]">$19.95<span className="text-lg font-normal text-[color:var(--brand-muted)]">/mo</span></span>
                </div>
                <div>
                  <p className="font-semibold text-[color:var(--brand-ink)]">{t("annual", "Annual")}</p>
                  <p className="text-sm text-[color:var(--brand-muted)]">
                    {t("invoicedEveryYear", "Invoiced every year")}
                  </p>
                </div>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
                  isAnnual ? "border-primary bg-primary" : "border-[color:var(--brand-line)]"
                }`}>
                  {isAnnual && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>

              {/* Monthly Plan */}
              <button
                onClick={() => setIsAnnual(false)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  !isAnnual
                    ? "border-primary bg-white shadow-lg"
                    : "border-[color:var(--brand-line)] bg-white hover:border-[color:var(--brand-line)]"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-lilac)] flex items-center justify-center">
                    <img src="/assets/same-assets/2774339654.svg" alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-bold text-[color:var(--brand-ink)]">$49.95<span className="text-lg font-normal text-[color:var(--brand-muted)]">/mo</span></span>
                </div>
                <div>
                  <p className="font-semibold text-[color:var(--brand-ink)]">{t("monthly", "Monthly")}</p>
                  <p className="text-sm text-[color:var(--brand-muted)]">
                    {t("invoicedEveryMonth", "Invoiced every month")}
                  </p>
                </div>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
                  !isAnnual ? "border-primary bg-primary" : "border-[color:var(--brand-line)]"
                }`}>
                  {!isAnnual && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full mt-6 bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium py-4 h-14 rounded-xl text-lg disabled:opacity-50"
            >
              {loading
                ? t("processing", "Processing...")
                : session
                ? t("buyNow", "Buy Now")
                : t("signInToSubscribe", "Sign in to Subscribe")}
            </Button>
          </div>

          {/* Features */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[color:var(--brand-ink)]">
              {t("unlimitedAccess", "Unlimited access to premium features")}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-[color:var(--brand-cream)] flex items-center justify-center flex-shrink-0">
                  <img src={feature.icon} alt="" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-[color:var(--brand-ink)] text-sm flex items-center gap-2">
                    {t(feature.titleKey, feature.title)}
                    {feature.isNew && (
                      <span className="bg-secondary text-white text-[10px] px-2 py-0.5 rounded-full">
                        {t("new", "new")}
                      </span>
                    )}
                  </p>
                  {feature.subtitle && (
                    <p className="text-xs text-[color:var(--brand-muted)]">
                      {t(feature.subtitleKey ?? "", feature.subtitle)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Brand logos marquee */}
          <div className="marquee-container mb-16 py-4">
            <div className="marquee-content">
              {[...brands, ...brands].map((brand, index) => (
                <img
                  key={index}
                  src={brand}
                  alt=""
                  className="h-8 mx-8 opacity-60 grayscale"
                />
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[color:var(--brand-ink)] text-center mb-8">
              {t("questionsAndAnswers", "Questions & Answers")}
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white rounded-xl border-none px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left font-medium text-[color:var(--brand-ink)] py-5 hover:no-underline">
                    {t(item.questionKey, item.question)}
                  </AccordionTrigger>
                  <AccordionContent className="text-[color:var(--brand-muted)] pb-5">
                    {t(item.answerKey, item.answer)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
