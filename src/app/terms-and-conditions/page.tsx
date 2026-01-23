"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto prose prose-gray">
            <h1 className="text-4xl font-bold text-[color:var(--brand-ink)] mb-8">Terms & Conditions</h1>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <p className="text-[color:var(--brand-ink)]">
                <strong>The service may include subscriptions that renew automatically.</strong> Please review these Terms and Conditions of Use thoroughly before starting a trial or completing a purchase for an auto-renewing subscription. To prevent charges, you must actively cancel a subscription or trial before it ends.
              </p>
            </div>

            <p className="text-[color:var(--brand-muted)] mb-6">
              If you need assistance with canceling a subscription or trial, feel free to contact us.
            </p>

            <p className="text-[color:var(--brand-muted)] mb-6">
              This Terms of Use for QwerPDF ("Company," "Site," "Website," "Application," "We," "Us," or "Our") outlines the rules and conditions governing your use of our services ("Services"), such as when you:
            </p>

            <p className="text-[color:var(--brand-muted)] mb-6">
              Visit our website at: https://qwerpdf.com
            </p>

            <p className="text-[color:var(--brand-muted)] mb-8">
              The website is owned by Apollo Technology LLC a company incorporated in the United States, with its registered office at 3523 45th Street South, Suite 100, Fargo, North Dakota, 58104, USA.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              By accessing and using the Service, you agree to these Terms, which form a legally binding contract between you and the Company. Please ensure you read these Terms carefully before using the Service.
            </p>
            <p className="text-[color:var(--brand-muted)] mb-6">
              We also encourage you to review our Privacy Policy. The Privacy Policy, along with any additional terms, policies, or documents posted on the Service, is incorporated into these Terms by reference. The Company reserves the right to update or modify these Terms at any time and for any reason at its sole discretion.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">2. Important Disclaimers</h2>
            <p className="text-[color:var(--brand-muted)] mb-6 uppercase text-sm">
              WE MAKE NO GUARANTEES THAT (I) THE SERVICE WILL MEET YOUR REQUIREMENTS, (II) THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, (III) THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE SERVICE WILL BE ACCURATE OR RELIABLE, OR (IV) THE QUALITY OF ANY PRODUCTS, SERVICES, INFORMATION, OR OTHER MATERIAL PURCHASED OR OBTAINED BY YOU THROUGH THE SERVICE WILL MEET YOUR EXPECTATIONS OR WILL PROVIDE ANY BENEFIT.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">3. The Service</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              The Service offers users the ability to view, edit, annotate, and sign PDF documents. The Service also allows the conversion of different file formats to PDF format. The Service is provided via web software interface.
            </p>
            <p className="text-[color:var(--brand-muted)] mb-6">
              By using the Service, you represent and warrant to the Company that: (i) all information you provide is truthful and accurate, and (ii) your use of the Service complies with all applicable laws, regulations, and these Terms.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">4. Account Registration</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              To access certain features of the Service, you may need to create an account ("Account") and provide information as requested during the registration process.
            </p>
            <p className="text-[color:var(--brand-muted)] mb-6">
              By registering an Account, you represent and warrant to the Company that: (i) the information you provide is truthful and accurate; (ii) you will keep this information up-to-date; and (iii) your use of the Service complies with applicable laws, regulations, and these Terms.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">5. Intellectual Property, User Content</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              Subject to these Terms, the Company grants you a non-exclusive, non-transferable, revocable license (without the right to sublicense) to use the Service solely for your personal, non-commercial purposes.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">6. Payments and Refunds</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              Some features of the Service may require payment ("Purchase"), which can be made directly through us.
            </p>
            <p className="text-[color:var(--brand-muted)] mb-6">
              To the extent permitted by applicable law, we reserve the right to modify Purchase fees at any time. Any pricing changes will be communicated to you in advance, either through updates on the Service or via email notification.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">7. User Representations and Restrictions</h2>
            <p className="text-[color:var(--brand-muted)] mb-4">By using the Service, you confirm and agree to the following:</p>
            <ul className="list-disc pl-6 mb-6 text-[color:var(--brand-muted)] space-y-2">
              <li>You have the legal authority and agree to abide by these Terms.</li>
              <li>You are at least 16 years old.</li>
              <li>You will not access the Service through automated or non-human means, such as bots or scripts.</li>
              <li>You will not use the Service for any illegal or unauthorized purposes.</li>
              <li>Your use of the Service will comply with all applicable laws and regulations.</li>
            </ul>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-[color:var(--brand-muted)] mb-6 uppercase text-sm">
              IN NO EVENT SHALL WE BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY LOST PROFIT OR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL OR PUNITIVE DAMAGES ARISING FROM THESE TERMS OR YOUR USE OF, OR INABILITY TO USE, THE SERVICE.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">9. Indemnity</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              You agree to indemnify and hold the Company, its successors, subsidiaries, any related companies, its suppliers, licensors and partners, and the officers, directors, employees, agents and representatives of each of them harmless, including costs and attorneys' fees, from any claim or demand made by any third party due to or arising out of (i) your use of the Service, (ii) your User Content, or (iii) your violation of these Terms.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">10. Dispute Resolution</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              You agree that any judicial proceeding to resolve claims or disputes relating to these Terms of Use will be brought in the state or federal courts located in Miami, Florida, subject to the mandatory arbitration provisions below.
            </p>

            <h2 className="text-2xl font-bold text-[color:var(--brand-ink)] mt-8 mb-4">11. Contact</h2>
            <p className="text-[color:var(--brand-muted)] mb-6">
              If you want to send any notice under these Terms or have any questions regarding the Service, you may contact us at: support@qwerpdf.com.
            </p>

            <p className="text-[color:var(--brand-muted)] font-medium mt-8">
              I HAVE READ THESE TERMS AND AGREE TO ALL OF THE PROVISIONS CONTAINED ABOVE.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
