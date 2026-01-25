"use client";

import Link from "@/components/AppLink";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/LanguageProvider";

const complianceBadges = [
  { label: "GDPR", color: "var(--brand-purple)" },
  { label: "SOC 2", color: "var(--brand-purple-dark)" },
  { label: "PCI", color: "var(--brand-orange)" },
  { label: "ISO", color: "var(--brand-orange-dark)" },
  { label: "CCPA", color: "var(--brand-purple)" },
];

export default function Footer() {
  const { lang, setLang, languages, t } = useLanguage();

  return (
    <footer className="bg-gradient-to-b from-[color:var(--brand-cream)] to-white pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-14 pb-10 border-b border-[color:var(--brand-line)]">
          {/* Logo and tagline */}
          <div className="lg:col-span-2">
            <div className="flex flex-col items-start gap-1">
              <Link href="/" className="inline-flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="QwerPDF"
                  className="h-7 w-auto block"
                />
              </Link>
              <p className="text-[color:var(--brand-muted)] font-medium text-base leading-snug">
                {t("footerTagline", "All-in-one PDF solutions")}
              </p>
            </div>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">
              {t("help", "Help")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact-us" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("contactUs", "Contact us")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("faq", "FAQ")}
                </Link>
              </li>
              <li>
                <Link href="/plan" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("pricing", "Pricing")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">
              {t("account", "Account")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/app/sign-in" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("signIn", "Sign in")}
                </Link>
              </li>
              <li>
                <Link href="/app/sign-in" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("continueWithGoogle", "Continue with Google")}
                </Link>
              </li>
              <li>
                <Link href="/unsubscribe" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("unsubscribe", "Unsubscribe")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-[color:var(--brand-ink)] mb-5 text-base">
              {t("legal", "Legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/terms-and-conditions" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("termsAndConditions", "Terms & Conditions")}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-[color:var(--brand-muted)] hover:text-primary transition-colors text-base">
                  {t("privacyPolicy", "Privacy Policy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-[color:var(--brand-ink)] text-base mb-1">
              © {t("allRightsReserved", "QwerPDF | All rights reserved")}
            </p>
            <p className="text-[color:var(--brand-muted)] text-sm">Apollo Technology LLC - Fargo, ND, USA</p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Security & Compliance */}
            <div>
              <p className="text-base text-[color:var(--brand-muted)] mb-3 font-medium">
                {t("securityCompliance", "Security & Compliance")}
              </p>
              <div className="flex items-center gap-2">
                {complianceBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.color }}
                  >
                    <span className="text-white text-[9px] font-bold">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
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
                {languages.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
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
