"use client";

import Link from "@/components/AppLink";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

const complianceBadges = [
  { label: "GDPR", color: "bg-primary" },
  { label: "SOC 2", color: "bg-[color:var(--brand-purple-dark)]" },
  { label: "PCI", color: "bg-secondary" },
  { label: "ISO", color: "bg-[color:var(--brand-orange-dark)]" },
  { label: "CCPA", color: "bg-[color:var(--brand-purple)]" },
];

export default function Footer() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <footer className="bg-gradient-to-b from-[color:var(--brand-cream)] to-white pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-14 pb-10 border-b border-[color:var(--brand-line)]">
          {/* Logo and tagline */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-5">
              <img
                src="/logo.png"
                alt="QwerPDF"
                className="h-28 w-auto"
              />
            </Link>
            <p className="text-[color:var(--brand-muted)] font-medium text-base">All-in-one PDF solutions</p>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">Help</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/en/contact-us" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/en/faq" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/en/plan" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/app/sign-in" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/app/sign-in" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Continue with Google
                </Link>
              </li>
              <li>
                <Link href="/en/unsubscribe" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Unsubscribe
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/en/terms-and-conditions" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/en/privacy-policy" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-[color:var(--brand-ink)] text-base mb-1">© QwerPDF | All rights reserved</p>
            <p className="text-[color:var(--brand-muted)] text-sm">Apollo Technology LLC - Fargo, ND, USA</p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Security & Compliance */}
            <div>
              <p className="text-base text-[color:var(--brand-muted)] mb-3 font-medium">Security & Compliance</p>
              <div className="flex items-center gap-2">
                {complianceBadges.map((badge, index) => (
                  <div
                    key={index}
                    className={`w-10 h-10 ${badge.color} rounded-full flex items-center justify-center`}
                  >
                    <span className="text-white text-[9px] font-bold">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[180px] bg-white border-[color:var(--brand-line)] h-11">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--brand-muted)]">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </footer>
  );
}
