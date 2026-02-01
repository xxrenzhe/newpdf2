import type { Metadata } from "next";
import { toolByKey } from "@/lib/tools";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pdftools.app";

type Props = {
  params: Promise<{ tool: string }>;
  children: React.ReactNode;
};

// Generate dynamic metadata for each tool page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: toolKey } = await params;
  const tool = toolByKey[toolKey];

  if (!tool) {
    return {
      title: "PDF Tool Not Found",
      description: "The requested PDF tool could not be found.",
    };
  }

  const title = `${tool.name} – Free Online PDF Tool`;
  const description = `${tool.description} Free, fast, and secure. Works entirely in your browser with no file uploads to servers.`;

  return {
    title,
    description,
    keywords: [
      tool.name.toLowerCase(),
      "PDF",
      "online",
      "free",
      "browser-based",
      "secure",
      "no upload",
      ...tool.name.toLowerCase().split(" "),
    ],
    alternates: {
      canonical: tool.href,
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${tool.href}`,
      title,
      description,
      siteName: "PDF Tools",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: tool.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function ToolLayout({ children, params }: Props) {
  const { tool: toolKey } = await params;
  const isEditorTool = toolKey === "annotate" || toolKey === "edit";
  if (isEditorTool) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 bg-gradient-pink">{children}</div>
      <Footer />
    </div>
  );
}
