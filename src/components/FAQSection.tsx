"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/components/LanguageProvider";

const faqItems = [
  {
    questionKey: "faqWhatIs",
    question: "What is QwerPDF?",
    answerKey: "faqWhatIsAnswer",
    answer: "QwerPDF is an all-in-one online PDF editor that allows you to edit, convert, sign, and manage your PDF documents easily and securely. It provides over 50 tools for all your PDF needs.",
  },
  {
    questionKey: "faqNoInstall",
    question: "Do I need to download or install anything to use QwerPDF?",
    answerKey: "faqNoInstallAnswer",
    answer: "No, QwerPDF is completely web-based. You can use all our tools directly in your browser without downloading any software or installing browser extensions.",
  },
  {
    questionKey: "faqMerge",
    question: "Can I merge PDF files with QwerPDF?",
    answerKey: "faqMergeAnswer",
    answer: "Yes, you can easily merge multiple PDF files into one document using our Merge Documents tool. Simply upload your files and combine them in any order you prefer.",
  },
  {
    questionKey: "faqConvertWord",
    question: "Can I convert a Word document into a PDF?",
    answerKey: "faqConvertWordAnswer",
    answer: "Absolutely! QwerPDF supports converting various file formats including Word (DOC, DOCX), Excel (XLS, XLSX), PowerPoint (PPT, PPTX), and images to PDF format.",
  },
  {
    questionKey: "faqOrganizePages",
    question: "How do I add, move and rotate pages?",
    answerKey: "faqOrganizePagesAnswer",
    answer: "Use our Organize Pages tool to add, move, delete, or rotate pages in your PDF documents. Simply upload your PDF and drag pages to reorder them or use the rotation controls.",
  },
  {
    questionKey: "faqFreeTools",
    question: "Why are certain websites offering PDF editing features for free?",
    answerKey: "faqFreeToolsAnswer",
    answer: "Some websites offer limited free features but may have restrictions on file size, number of documents, or include watermarks. QwerPDF provides full-featured premium tools with no limitations for subscribers.",
  },
  {
    questionKey: "faqSafe",
    question: "Is QwerPDF safe to use?",
    answerKey: "faqSafeAnswer",
    answer: "Yes, QwerPDF uses industry-standard encryption and security measures to protect your documents and personal information. Files are automatically deleted after processing unless you choose to save them.",
  },
];

export default function FAQSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-[color:var(--brand-cream)]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[color:var(--brand-ink)] mb-4">
            {t("faqTitle", "Frequently Asked Questions")}
          </h2>
          <p className="text-lg text-[color:var(--brand-muted)]">
            {t("faqSubtitle", "Find answers to common questions about our PDF tools")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-2xl border-2 border-[color:var(--brand-line)] px-7 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-[color:var(--brand-ink)] py-6 hover:no-underline text-lg">
                  {t(item.questionKey, item.question)}
                </AccordionTrigger>
                <AccordionContent className="text-[color:var(--brand-muted)] pb-6 text-base leading-relaxed">
                  {t(item.answerKey, item.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
