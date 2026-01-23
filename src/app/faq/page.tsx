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

const faqCategories = {
  general: [
    { question: "What is QwerPDF?", answer: "QwerPDF is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely." },
    { question: "Do I need to download or install anything to use QwerPDF?", answer: "No, QwerPDF is completely web-based. You can use all our tools directly in your browser without downloading any software." },
    { question: "Can I merge PDF files with QwerPDF?", answer: "Yes, you can easily merge multiple PDF files into one document using our Merge Documents tool." },
    { question: "Can I convert a Word document into a PDF?", answer: "Absolutely! QwerPDF supports converting various file formats including Word, Excel, PowerPoint, and images to PDF." },
    { question: "How do I add, move and rotate pages?", answer: "Use our Organize Pages tool to add, move, delete, or rotate pages in your PDF documents." },
    { question: "Why are certain websites offering PDF editing features for free?", answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks. QwerPDF provides full-featured premium tools with no limitations." },
  ],
  security: [
    { question: "Is QwerPDF safe to use?", answer: "Yes, QwerPDF uses industry-standard encryption and security measures to protect your documents and personal information." },
    { question: "Where does QwerPDF store my documents?", answer: "Your documents are stored on secure cloud servers with encryption. Files are automatically deleted after processing unless you choose to save them to your account." },
    { question: "Does QwerPDF support single sign on?", answer: "Yes, we support SSO (Single Sign-On) for enterprise customers through various identity providers." },
    { question: "How do I Password Protect a PDF?", answer: "Upload your PDF to QwerPDF, select the Password Protect tool, set your desired password, and download the secured file." },
  ],
  billing: [
    { question: "Will my subscription renew automatically?", answer: "Yes, subscriptions renew automatically unless you cancel before the renewal date." },
    { question: "How can I cancel my subscription?", answer: "You can cancel your subscription from your account settings under the Subscription section." },
    { question: "What will happen if I cancel my subscription?", answer: "You will continue to have access to premium features until the end of your billing period. After that, your account will revert to free features." },
    { question: "What does the paid trial give me access to?", answer: "The paid trial gives you full access to all premium features for a limited time." },
    { question: "Can I change my plan?", answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings." },
    { question: "What are my payment options?", answer: "We accept all major credit cards, PayPal, and other payment methods depending on your region." },
  ],
};

type CategoryKey = keyof typeof faqCategories;

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState<CategoryKey>("general");

  const tabs: { key: CategoryKey; label: string }[] = [
    { key: "general", label: "General" },
    { key: "security", label: "Security" },
    { key: "billing", label: "Account & Billing" },
  ];

  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-10">
            Frequently Asked Questions
          </h1>

          {/* Tabs */}
          <div className="flex justify-center gap-4 md:gap-8 mb-12 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 px-2 font-medium transition-all ${
                  activeTab === tab.key
                    ? "text-[#2d85de] border-b-2 border-[#2d85de]"
                    : "text-gray-500 hover:text-gray-700"
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
                <h2 className="text-2xl font-bold text-gray-900">General</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.general.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`general-${index}`}
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
            )}

            {/* Security Section */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Security</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.security.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`security-${index}`}
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
            )}

            {/* Billing Section */}
            {activeTab === "billing" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Account & Billing</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqCategories.billing.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`billing-${index}`}
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
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
