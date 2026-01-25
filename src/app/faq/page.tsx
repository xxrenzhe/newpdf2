"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/components/LanguageProvider";

const faqCategories = {
  general: [
    {
      questionKey: "faqGeneral1Q",
      question: "What is QwerPDF?",
      answerKey: "faqGeneral1A",
      answer: "QwerPDF is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely.",
    },
    {
      questionKey: "faqGeneral2Q",
      question: "Do I need to download or install anything to use QwerPDF?",
      answerKey: "faqGeneral2A",
      answer: "No, QwerPDF is completely web-based. You can use all our tools directly in your browser without downloading any software.",
    },
    {
      questionKey: "faqGeneral3Q",
      question: "Can I merge PDF files with QwerPDF?",
      answerKey: "faqGeneral3A",
      answer: "Yes, you can easily merge multiple PDF files into one document using our Merge Documents tool.",
    },
    {
      questionKey: "faqGeneral4Q",
      question: "Can I convert a Word document into a PDF?",
      answerKey: "faqGeneral4A",
      answer: "Absolutely! QwerPDF supports converting various file formats including Word, Excel, PowerPoint, and images to PDF.",
    },
    {
      questionKey: "faqGeneral5Q",
      question: "How do I add, move and rotate pages?",
      answerKey: "faqGeneral5A",
      answer: "Use our Organize Pages tool to add, move, delete, or rotate pages in your PDF documents.",
    },
    {
      questionKey: "faqGeneral6Q",
      question: "Why are certain websites offering PDF editing features for free?",
      answerKey: "faqGeneral6A",
      answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks. QwerPDF provides full-featured premium tools with no limitations.",
    },
  ],
  security: [
    {
      questionKey: "faqSecurity1Q",
      question: "Is QwerPDF safe to use?",
      answerKey: "faqSecurity1A",
      answer: "Yes, QwerPDF uses industry-standard encryption and security measures to protect your documents and personal information.",
    },
    {
      questionKey: "faqSecurity2Q",
      question: "Where does QwerPDF store my documents?",
      answerKey: "faqSecurity2A",
      answer: "Your documents are stored on secure cloud servers with encryption. Files are automatically deleted after processing unless you choose to save them to your account.",
    },
    {
      questionKey: "faqSecurity3Q",
      question: "Does QwerPDF support single sign on?",
      answerKey: "faqSecurity3A",
      answer: "Yes, we support SSO (Single Sign-On) for enterprise customers through various identity providers.",
    },
    {
      questionKey: "faqSecurity4Q",
      question: "How do I Password Protect a PDF?",
      answerKey: "faqSecurity4A",
      answer: "Upload your PDF to QwerPDF, select the Password Protect tool, set your desired password, and download the secured file.",
    },
  ],
  billing: [
    {
      questionKey: "faqBilling1Q",
      question: "Will my subscription renew automatically?",
      answerKey: "faqBilling1A",
      answer: "Yes, subscriptions renew automatically unless you cancel before the renewal date.",
    },
    {
      questionKey: "faqBilling2Q",
      question: "How can I cancel my subscription?",
      answerKey: "faqBilling2A",
      answer: "You can cancel your subscription from your account settings under the Subscription section.",
    },
    {
      questionKey: "faqBilling3Q",
      question: "What will happen if I cancel my subscription?",
      answerKey: "faqBilling3A",
      answer: "You will continue to have access to premium features until the end of your billing period. After that, your account will revert to free features.",
    },
    {
      questionKey: "faqBilling4Q",
      question: "What does the paid trial give me access to?",
      answerKey: "faqBilling4A",
      answer: "The paid trial gives you full access to all premium features for a limited time.",
    },
    {
      questionKey: "faqBilling5Q",
      question: "Can I change my plan?",
      answerKey: "faqBilling5A",
      answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings.",
    },
    {
      questionKey: "faqBilling6Q",
      question: "What are my payment options?",
      answerKey: "faqBilling6A",
      answer: "We accept all major credit cards, PayPal, and other payment methods depending on your region.",
    },
  ],
};

type CategoryKey = keyof typeof faqCategories;

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState<CategoryKey>("general");
  const { t } = useLanguage();

  const tabs: { key: CategoryKey; label: string }[] = [
    { key: "general", label: t("general", "General") },
    { key: "security", label: t("security", "Security") },
    { key: "billing", label: t("accountBilling", "Account & Billing") },
  ];

  return (
    <main className="min-h-screen bg-[color:var(--brand-cream)]">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-10">
            {t("faqTitle", "Frequently Asked Questions")}
          </h1>

          {/* Tabs */}
          <div className="flex justify-center gap-4 md:gap-8 mb-12 border-b border-[color:var(--brand-line)]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAQ Sections */}
          <div className="max-w-3xl mx-auto">
            {/* General Section */}
            {activeTab === "general" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-[color:var(--brand-ink)]">
                  {t("general", "General")}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.general.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`general-${index}`}
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
            )}

            {/* Security Section */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-[color:var(--brand-ink)]">
                  {t("security", "Security")}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.security.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`security-${index}`}
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
            )}

            {/* Billing Section */}
            {activeTab === "billing" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-[color:var(--brand-ink)]">
                  {t("accountBilling", "Account & Billing")}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.billing.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`billing-${index}`}
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
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
