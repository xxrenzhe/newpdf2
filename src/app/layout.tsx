import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Files Editor – Edit, Sign, Convert & Manage PDF Files Online",
  description: "Use Files Editor to edit, sign, convert, and manage your PDF documents online. Fast, secure, and easy-to-use tools for all your PDF needs.",
  icons: {
    icon: "https://ext.same-assets.com/170935311/3229571306.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
