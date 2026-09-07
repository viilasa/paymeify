import type { Metadata } from "next";

import { LegalDoc } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Paymeify.",
  alternates: { canonical: "/terms" },
  openGraph: {
    url: "https://www.paymeify.com/terms",
    title: "Terms of Service · Paymeify",
    description: "Terms of Service for Paymeify.",
  },
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="6 September 2026">
      <p>
        These terms govern your use of Paymeify at www.paymeify.com (the
        “Service”). By creating an account or using the Service, you agree to
        them. If you do not agree, do not use Paymeify.
      </p>

      <h2>1. What Paymeify is</h2>
      <p>
        Paymeify is a project and milestone tracker with a private client link.
        You create projects, break them into milestones, share one link, and
        record payments as work is delivered. Clients do not need an account.
      </p>
      <p>
        Paymeify is not a bank, payment processor, wallet, marketplace, or
        escrow. We do not collect, hold, or settle client funds. Money moves
        through the payment method you choose — your UPI ID, your Razorpay
        account, or your Stripe account.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must provide accurate details and keep your login safe. You are
        responsible for activity under your account, including projects,
        milestone amounts, payment keys, and the people you send links to.
      </p>
      <p>
        You must be old enough to form a binding contract in your country. The
        Service is for business use by freelancers and studios, not for
        consumer checkout of physical goods.
      </p>

      <h2>3. Client project links</h2>
      <p>
        Each project has a private token URL. Anyone who has the link can see
        the project name, milestones, amounts, and payment options, and can
        start a payment. Treat the link like a secret. If it leaks, rotate it
        from project settings or stop sharing it.
      </p>

      <h2>4. Payments</h2>
      <ul>
        <li>
          UPI / GPay: the client pays you directly. “I have paid” is a claim
          only. A milestone is unpaid until you confirm it.
        </li>
        <li>
          Razorpay and Stripe: you paste your own keys. Automatic “paid” status
          happens only after a signed webhook from that provider.
        </li>
        <li>
          Paymeify does not take a platform fee. Provider fees are between you
          and Razorpay or Stripe.
        </li>
        <li>
          Disputes, refunds, chargebacks, and tax invoices are yours to handle
          with the client and the provider.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You will not use the Service to:</p>
      <ul>
        <li>break the law, launder money, or collect payments you are not entitled to</li>
        <li>probe, scrape, or attack the Service or other users</li>
        <li>upload malware or misrepresent who you are to a client</li>
        <li>resell or clone the Service without our written permission</li>
      </ul>
      <p>We may suspend or delete an account that violates these terms.</p>

      <h2>6. Content</h2>
      <p>
        You keep ownership of project names, descriptions, and other content
        you enter. You grant us a limited licence to host and display that
        content so the Service can function — including showing it on the
        client link you share.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        We aim to keep the Service available but do not guarantee unbroken
        uptime. Features can change. We may update these terms; the “Last
        updated” date will change. Continued use after an update means you
        accept the new terms.
      </p>
      <p>
        Paymeify may offer Free and Pro plans. Current prices are on
        www.paymeify.com. We do not take a cut of client payments;
        gateway fees stay with your bank, Razorpay, or Stripe.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        The Service is provided “as is.” We do not warrant that it will be
        error-free or that a payment will always settle. You are responsible
        for checking your bank or gateway before treating work as paid.
      </p>

      <h2>9. Liability</h2>
      <p>
        To the fullest extent allowed by law, Paymeify is not liable for lost
        profits, lost payments, chargebacks, or indirect damages. Our total
        liability for a claim relating to the Service is limited to the amount
        you paid us for the Service in the three months before the claim (which
        is zero on the Free plan).
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of India. Courts in India have
        exclusive jurisdiction, except where local consumer law says otherwise.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: write to hello@paymeify.com or use
        www.paymeify.com.
      </p>
    </LegalDoc>
  );
}
