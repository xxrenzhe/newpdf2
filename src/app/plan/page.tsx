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

const features = [
  { icon: "/assets/same-assets/1797688836.svg", title: "Powerful PDF Editor" },
  { icon: "/assets/same-assets/2537515307.svg", title: "Digital Signatures", isNew: true },
  { icon: "/assets/same-assets/1990291496.svg", title: "Workspace", subtitle: "with File Manager" },
  { icon: "/assets/same-assets/3612369820.svg", title: "Unlimited File Conversion" },
  { icon: "/assets/same-assets/867393456.svg", title: "Redaction Tool", isNew: true },
  { icon: "/assets/same-assets/3533335575.svg", title: "Drive, OneDrive", subtitle: "& DropBox integration" },
  { icon: "/assets/same-assets/3216288370.svg", title: "OCR technology" },
  { icon: "/assets/same-assets/1530033771.svg", title: "Page Manipulation", isNew: true },
  { icon: "/assets/same-assets/2231875426.svg", title: "No Software", subtitle: "Installation Required" },
  { icon: "/assets/same-assets/4206478627.svg", title: "Multiple Security Tools" },
  { icon: "/assets/same-assets/1702208235.svg", title: "SSO Sign in", isNew: true },
  { icon: "/assets/same-assets/981624432.svg", title: "Access to All Upcoming", subtitle: "Features" },
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
  { question: "What are my payment options?", answer: "We accept all major credit cards, PayPal, and other payment methods depending on your region." },
  { question: "Why are certain websites offering PDF editing features for free?", answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks." },
  { question: "Is QwerPDF safe to use?", answer: "Yes, QwerPDF uses industry-standard encryption and security measures to protect your documents and personal information." },
  { question: "Can I change my plan?", answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings." },
  { question: "What will happen if I cancel my subscription?", answer: "You will continue to have access to premium features until the end of your billing period." },
  { question: "How can I cancel my subscription?", answer: "You can cancel your subscription from your account settings under the Subscription section." },
  { question: "Will my subscription renew automatically?", answer: "Yes, subscriptions renew automatically unless you cancel before the renewal date." },
];

export default function PlanPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!session) {
      router.push("/sign-in");
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
        alert("Unable to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-10">
            Plans <span className="text-[#2d85de]">&</span> Pricing
          </h1>

          {/* Pricing Cards */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Annual Plan */}
              <button
                onClick={() => setIsAnnual(true)}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  isAnnual
                    ? "border-[#2d85de] bg-white shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {isAnnual && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#15bb6f] text-white text-xs font-medium px-3 py-1 rounded-full">
                    Save 60%
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <img src="/assets/same-assets/2242939468.svg" alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">$19.95<span className="text-lg font-normal text-gray-500">/mo</span></span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Annual</p>
                  <p className="text-sm text-gray-500">Invoiced every year</p>
                </div>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
                  isAnnual ? "border-[#2d85de] bg-[#2d85de]" : "border-gray-300"
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
                    ? "border-[#2d85de] bg-white shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <img src="/assets/same-assets/2774339654.svg" alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">$49.95<span className="text-lg font-normal text-gray-500">/mo</span></span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Monthly</p>
                  <p className="text-sm text-gray-500">Invoiced every month</p>
                </div>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
                  !isAnnual ? "border-[#2d85de] bg-[#2d85de]" : "border-gray-300"
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
              className="w-full mt-6 bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium py-4 h-14 rounded-xl text-lg disabled:opacity-50"
            >
              {loading ? "Processing..." : session ? "Buy Now" : "Sign in to Subscribe"}
            </Button>
          </div>

          {/* Features */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Unlimited access to premium features
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <img src={feature.icon} alt="" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    {feature.title}
                    {feature.isNew && (
                      <span className="bg-[#15bb6f] text-white text-[10px] px-2 py-0.5 rounded-full">new</span>
                    )}
                  </p>
                  {feature.subtitle && (
                    <p className="text-xs text-gray-500">{feature.subtitle}</p>
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
              Questions & Answers
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white rounded-xl border-none px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left font-medium text-gray-900 py-5 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-5">
                    {item.answer}
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
