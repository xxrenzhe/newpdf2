import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SecurityInitializer } from "@/components/SecurityInitializer";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pdftools.app";

const jakarta = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "PDF Tools – Edit, Sign, Convert & Manage PDF Files Online",
    template: "%s | PDF Tools",
  },
  description:
    "Free online PDF tools to edit, sign, convert, merge, split, compress, and manage your PDF documents. Fast, secure, and runs entirely in your browser.",
  keywords: [
    "PDF editor",
    "PDF converter",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "sign PDF",
    "PDF watermark",
    "PDF tools online",
    "free PDF tools",
    "online PDF editor",
  ],
  authors: [{ name: "PDF Tools Team" }],
  creator: "PDF Tools",
  publisher: "PDF Tools",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "PDF Tools",
    title: "PDF Tools – Edit, Sign, Convert & Manage PDF Files Online",
    description:
      "Free online PDF tools to edit, sign, convert, merge, split, compress, and manage your PDF documents. Fast, secure, and runs entirely in your browser.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PDF Tools - All-in-One PDF Solution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Tools – Edit, Sign, Convert & Manage PDF Files",
    description:
      "Free online PDF tools. Edit, sign, convert, merge, split, compress PDFs. Runs in your browser for maximum privacy.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#2c1e4a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} antialiased`} suppressHydrationWarning>
        <SecurityInitializer />
        <Providers>
          <LanguageProvider>{children}</LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
