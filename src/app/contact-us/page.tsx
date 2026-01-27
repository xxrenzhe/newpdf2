"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/components/LanguageProvider";

const subjects = [
  { key: "subjectGeneral", label: "General Inquiry" },
  { key: "subjectSupport", label: "Technical Support" },
  { key: "subjectBilling", label: "Billing Question" },
  { key: "subjectFeature", label: "Feature Request" },
  { key: "subjectBug", label: "Bug Report" },
  { key: "subjectPartnership", label: "Partnership" },
  { key: "subjectOther", label: "Other" },
];

const faqByTab = {
  general: [
    {
      questionKey: "contactFaqGeneral1Q",
      question: "What is QwerPDF?",
      answerKey: "contactFaqGeneral1A",
      answer: "QwerPDF is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely.",
    },
    {
      questionKey: "contactFaqGeneral2Q",
      question: "Do I need to download or install anything to use QwerPDF?",
      answerKey: "contactFaqGeneral2A",
      answer: "No, QwerPDF is completely web-based.",
    },
    {
      questionKey: "contactFaqGeneral3Q",
      question: "Can I merge PDF files with QwerPDF?",
      answerKey: "contactFaqGeneral3A",
      answer: "Yes, you can easily merge multiple PDF files into one document.",
    },
    {
      questionKey: "contactFaqGeneral4Q",
      question: "Can I convert a Word document into a PDF?",
      answerKey: "contactFaqGeneral4A",
      answer: "Yes. Our Convert tool currently supports PDF ↔ images/text and images → PDF. Office-to-PDF can be added via a backend conversion service.",
    },
  ],
  security: [
    {
      questionKey: "contactFaqSecurity1Q",
      question: "Is QwerPDF safe to use?",
      answerKey: "contactFaqSecurity1A",
      answer: "QwerPDF runs core PDF operations locally in your browser for many tools, so your files don't need to leave your device for basic edits, conversion, and compression.",
    },
    {
      questionKey: "contactFaqSecurity2Q",
      question: "Do you store my documents?",
      answerKey: "contactFaqSecurity2A",
      answer: "This demo app does not store your documents server-side unless you explicitly upload them to an external service.",
    },
  ],
  billing: [
    {
      questionKey: "contactFaqBilling1Q",
      question: "How can I cancel my subscription?",
      answerKey: "contactFaqBilling1A",
      answer: "You can cancel your subscription from your account settings.",
    },
  ],
} as const;

type FaqTab = keyof typeof faqByTab;

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    description: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<FaqTab>("general");
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    void (async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || t("contactSendFailed", "Failed to send"));
        }
        setStatus("sent");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t("contactSendFailed", "Failed to send"));
      }
    })();
  };

  return (
    <main className="min-h-screen bg-gradient-pink">
      <Header />

      <section className="py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-8 sm:mb-10">
            {t("contactUsTitle", "Contact Us")}
          </h1>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <p className="text-[color:var(--brand-muted)] mb-6">
                {t(
                  "contactUsDesc",
                  "Need assistance? Fill out the form below, and our team will get back to you as soon as we can."
                )}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {status === "sent" && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    {t(
                      "contactSendSuccess",
                      "Thanks! We received your message and will get back to you soon."
                    )}
                  </div>
                )}
                {status === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {errorMessage || t("contactSendError", "Something went wrong. Please try again.")}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
                    {t("fullName", "Full Name")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder={t("fullNamePlaceholder", "John Newman")}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-12 rounded-lg border-[color:var(--brand-line)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
                    {t("yourEmailAddress", "Your email address")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder", "example@mail.com")}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 rounded-lg border-[color:var(--brand-line)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
                    {t("subject", "Subject")} <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger className="h-12 rounded-lg border-[color:var(--brand-line)]">
                      <SelectValue placeholder={t("chooseSubject", "Choose subject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.key} value={subject.label}>
                          {t(subject.key, subject.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
                    {t("description", "Description")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      placeholder={t(
                        "descriptionPlaceholder",
                        "Please enter the details of your request. A member of our support staff will respond as soon as possible."
                      )}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-32 p-4 rounded-lg border border-[color:var(--brand-line)] resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={2000}
                      required
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-[color:var(--brand-muted)]">
                      {formData.description.length}/2000
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium h-11 sm:h-12 rounded-lg text-sm sm:text-base"
                >
                  {status === "sending" ? t("sending", "Sending…") : t("send", "Send")}
                </Button>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[color:var(--brand-ink)] text-center mb-6 sm:mb-8">
              {t("faqTitle", "Frequently Asked Questions")}
            </h2>

            <div className="flex items-center justify-start md:justify-center gap-3 sm:gap-4 md:gap-8 mb-6 sm:mb-8 border-b border-[color:var(--brand-line)] overflow-x-auto md:overflow-visible pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {(
                [
                  { key: "general", labelKey: "general", label: "General" },
                  { key: "security", labelKey: "security", label: "Security" },
                  { key: "billing", labelKey: "accountBilling", label: "Account & Billing" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? "text-primary border-b-2 border-primary"
                      : "text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)]"
                  }`}
                >
                  {t(tab.labelKey, tab.label)}
                </button>
              ))}
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqByTab[activeTab].map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`${activeTab}-${index}`}
                  className="bg-white rounded-xl border-none px-4 sm:px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left font-medium text-[color:var(--brand-ink)] py-4 sm:py-5 hover:no-underline text-sm sm:text-base">
                    {t(item.questionKey, item.question)}
                  </AccordionTrigger>
                  <AccordionContent className="text-[color:var(--brand-muted)] pb-4 sm:pb-5 text-sm sm:text-base">
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
