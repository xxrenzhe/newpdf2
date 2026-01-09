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

const subjects = [
  "General Inquiry",
  "Technical Support",
  "Billing Question",
  "Feature Request",
  "Bug Report",
  "Partnership",
  "Other",
];

const faqByTab = {
  general: [
    { question: "What is Files Editor?", answer: "Files Editor is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely." },
    { question: "Do I need to download or install anything to use Files Editor?", answer: "No, Files Editor is completely web-based." },
    { question: "Can I merge PDF files with Files Editor?", answer: "Yes, you can easily merge multiple PDF files into one document." },
    { question: "Can I convert a Word document into a PDF?", answer: "Yes. Our Convert tool currently supports PDF ↔ images/text and images → PDF. Office-to-PDF can be added via a backend conversion service." },
  ],
  security: [
    { question: "Is Files Editor safe to use?", answer: "Files Editor runs core PDF operations locally in your browser for many tools, so your files don't need to leave your device for basic edits, conversion, and compression." },
    { question: "Do you store my documents?", answer: "This demo app does not store your documents server-side unless you explicitly upload them to an external service." },
  ],
  billing: [
    { question: "How can I cancel my subscription?", answer: "You can cancel your subscription from your account settings." },
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
          throw new Error(data?.error || "Failed to send");
        }
        setStatus("sent");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to send");
      }
    })();
  };

  return (
    <main className="min-h-screen bg-gradient-pink">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-10">
            Contact Us
          </h1>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <p className="text-gray-600 mb-6">
                Need assistance? Fill out the form below, and our team will get back to you as soon as we can.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {status === "sent" && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    Thanks! We received your message and will get back to you soon.
                  </div>
                )}
                {status === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {errorMessage || "Something went wrong. Please try again."}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="John Newman"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-12 rounded-lg border-gray-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Your email address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="example@mail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 rounded-lg border-gray-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger className="h-12 rounded-lg border-gray-200">
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      placeholder="Please enter the details of your request. A member of our support staff will respond as soon as possible."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-32 p-4 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#2d85de] focus:border-transparent"
                      maxLength={2000}
                      required
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                      {formData.description.length}/2000
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium h-12 rounded-lg"
                >
                  {status === "sending" ? "Sending..." : "Send"}
                </Button>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>

            <div className="flex justify-center gap-4 md:gap-8 mb-8 border-b border-gray-200">
              {(
                [
                  { key: "general", label: "General" },
                  { key: "security", label: "Security" },
                  { key: "billing", label: "Account & Billing" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 px-2 font-medium transition-all ${
                    activeTab === tab.key
                      ? "text-[#2d85de] border-b-2 border-[#2d85de]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqByTab[activeTab].map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`${activeTab}-${index}`}
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
