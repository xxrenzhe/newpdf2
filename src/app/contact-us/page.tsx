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

const faqItems = [
  { question: "What is Files Editor?", answer: "Files Editor is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely." },
  { question: "Do I need to download or install anything to use Files Editor?", answer: "No, Files Editor is completely web-based." },
  { question: "Can I merge PDF files with Files Editor?", answer: "Yes, you can easily merge multiple PDF files into one document." },
  { question: "Can I convert a Word document into a PDF?", answer: "Absolutely! Files Editor supports converting various file formats." },
  { question: "Is Files Editor safe to use?", answer: "Yes, Files Editor uses industry-standard encryption and security measures." },
  { question: "How can I cancel my subscription?", answer: "You can cancel your subscription from your account settings." },
];

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
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
                  className="w-full bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium h-12 rounded-lg"
                >
                  Send
                </Button>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>

            <div className="flex justify-center gap-4 md:gap-8 mb-8">
              <button className="text-gray-500 hover:text-gray-700 font-medium">General</button>
              <button className="text-[#2d85de] border-b-2 border-[#2d85de] pb-1 font-medium">Security</button>
              <button className="text-gray-500 hover:text-gray-700 font-medium">Account & Billing</button>
            </div>

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
