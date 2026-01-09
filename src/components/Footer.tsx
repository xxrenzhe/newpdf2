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
    <footer className="bg-gradient-to-b from-[#f8fafb] to-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-8 border-b border-gray-200">
          {/* Logo and tagline */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <img
                src="https://ext.same-assets.com/170935311/3497447819.svg"
                alt="Files Editor"
                className="h-8"
              />
            </Link>
            <p className="text-gray-600 font-medium">All-in-one PDF solutions</p>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Help</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact-us" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/plan" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/sign-in" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/unsubscribe" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Unsubscribe
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms-and-conditions" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-600 hover:text-[#2d85de] transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">© Files Editor | All rights reserved</p>
            <p className="text-gray-500 text-xs">Apollo Technology LLC - Fargo, ND, USA</p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Security & Compliance */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Security & Compliance</p>
              <div className="flex items-center gap-2">
                {complianceBadges.map((badge, index) => (
                  <div
                    key={index}
                    className={`w-9 h-9 ${badge.color} rounded-full flex items-center justify-center`}
                  >
                    <span className="text-white text-[8px] font-bold">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[160px] bg-white border-gray-200">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
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
