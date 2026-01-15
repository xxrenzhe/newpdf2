"use client";

import Link from "next/link";
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
  { label: "GDPR", color: "bg-blue-600" },
  { label: "SOC 2", color: "bg-blue-800" },
  { label: "PCI", color: "bg-red-600" },
  { label: "ISO", color: "bg-cyan-600" },
  { label: "CCPA", color: "bg-teal-600" },
];

export default function Footer() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <footer className="bg-gradient-to-b from-[#f8fafb] to-white pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-14 pb-10 border-b border-gray-200">
          {/* Logo and tagline */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-5">
              <img
                src="/assets/brand/logo.svg"
                alt="Files Editor"
                className="h-10"
              />
            </Link>
            <p className="text-gray-600 font-medium text-base">All-in-one PDF solutions</p>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-5 text-base">Help</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/en/contact-us" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/en/faq" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/en/plan" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-5 text-base">Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/app/sign-in" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/app/sign-up" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/en/unsubscribe" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Unsubscribe
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-5 text-base">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/en/terms-and-conditions" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/en/privacy-policy" className="text-gray-600 hover:text-[#2d85de] transition-colors text-base">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-gray-600 text-base mb-1">© Files Editor | All rights reserved</p>
            <p className="text-gray-500 text-sm">Apollo Technology LLC - Fargo, ND, USA</p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Security & Compliance */}
            <div>
              <p className="text-base text-gray-600 mb-3 font-medium">Security & Compliance</p>
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
              <SelectTrigger className="w-[180px] bg-white border-gray-200 h-11">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
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
