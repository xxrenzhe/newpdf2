"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What is Files Editor?",
    answer: "Files Editor is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely. It provides over 50 tools for all your PDF needs.",
  },
  {
    question: "Do I need to download or install anything to use Files Editor?",
    answer: "No, Files Editor is completely web-based. You can use all our tools directly in your browser without downloading any software or installing browser extensions.",
  },
  {
    question: "Can I merge PDF files with Files Editor?",
    answer: "Yes, you can easily merge multiple PDF files into one document using our Merge Documents tool. Simply upload your files and combine them in any order you prefer.",
  },
  {
    question: "Can I convert a Word document into a PDF?",
    answer: "Absolutely! Files Editor supports converting various file formats including Word (DOC, DOCX), Excel (XLS, XLSX), PowerPoint (PPT, PPTX), and images to PDF format.",
  },
  {
    question: "How do I add, move and rotate pages?",
    answer: "Use our Organize Pages tool to add, move, delete, or rotate pages in your PDF documents. Simply upload your PDF and drag pages to reorder them or use the rotation controls.",
  },
  {
    question: "Why are certain websites offering PDF editing features for free?",
    answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks. Files Editor provides full-featured premium tools with no limitations for subscribers.",
  },
  {
    question: "Is Files Editor safe to use?",
    answer: "Yes, Files Editor uses industry-standard encryption and security measures to protect your documents and personal information. Files are automatically deleted after processing unless you choose to save them.",
  },
];

export default function FAQSection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-[#f8fafb] rounded-xl border-none px-6"
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
  );
}
