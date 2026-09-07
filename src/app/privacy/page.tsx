import type { Metadata } from "next";

import { LegalDoc } from "@/components/marketing/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Paymeify collects, uses, and stores your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    url: "https://www.paymeify.com/privacy",
    title: "Privacy Policy · Paymeify",
    description: "How Paymeify collects, uses, and stores your data.",
  },
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="6 September 2026">
      <p>
        This policy explains what Paymeify (www.paymeify.com) collects, why,
        and what you can do about it. If you use the Service, you agree to this
        policy.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Paymeify is a web app for freelancers to track project milestones and
        collect payment. We are the data controller for account data you submit
        to us. Contact: hello@paymeify.com.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          Account: name, email, password hash (or Google sign-in identifiers),
          and optional business name and UPI ID.
        </li>
        <li>
          Projects: project names, client names, client email and phone if you
          enter them, milestone titles, amounts, dates, and the public token
          used in the client link.
        </li>
        <li>
          Payments: payment status, optional UPI reference the client typed,
          and webhook event IDs from Razorpay or Stripe. We store encrypted
          copies of gateway keys you paste in Settings. We do not store full
          card numbers.
        </li>
        <li>
          Technical: cookies needed to keep you signed in, and standard server
          logs (IP, user agent, timestamps) used to run and secure the Service.
        </li>
      </ul>
      <p>
        Clients who open a project link do not create an account. Their
        browser may send a payment report or start checkout. We do not sell
        client contact lists — we typically never see a client email unless you
        typed it into a project field.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>to operate your account, projects, and client portal</li>
        <li>to send login, confirmation, and password-reset email</li>
        <li>to mark milestones paid after a verified webhook or your confirmation</li>
        <li>to keep the Service secure and debug failures</li>
      </ul>
      <p>
        We do not sell your personal data. We do not use it to advertise other
        people’s products.
      </p>

      <h2>4. Sharing</h2>
      <p>We share data only with:</p>
      <ul>
        <li>
          Infrastructure providers that host the app and database (currently
          Vercel and Supabase) under their terms.
        </li>
        <li>
          Payment providers you connect (Razorpay, Stripe) when a client pays
          through them. Their privacy policies apply to that checkout.
        </li>
        <li>
          Google Analytics, to understand how the public site is used. See
          Google’s privacy policy for how they process that data.
        </li>
        <li>
          Email and SMS providers (Resend and MSG91) when you ask us to notify
          a client. We send only the project name, amounts, and the private
          project link to the address or number you entered.
        </li>
        <li>Authorities if the law requires it.</li>
      </ul>
      <p>
        Anyone you send a project link to can see the project and payment
        details on that page. That is by design.
      </p>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for your session after you log in or sign up.
        On the production site we also load Google Analytics (gtag.js), which
        may set cookies to measure visits. We do not use advertising cookies
        and we do not run third-party ads.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep account and project data while your account is open. You can
        delete projects from the app. To delete your account and remaining
        data, email hello@paymeify.com. We may keep minimal records if the law
        requires it (for example, webhook audit rows) for a limited time.
      </p>

      <h2>7. Security</h2>
      <p>
        Access to your projects is protected by your login and by row-level
        security in the database. Gateway secrets are encrypted at rest.
        Client links are unguessable tokens; they are still a secret — do not
        post them publicly.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        export, or delete your personal data, or to object to certain
        processing. Email hello@paymeify.com. If you signed in with Google, you
        can also revoke access from your Google account.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not directed at children under 18. We do not knowingly
        collect data from them.
      </p>

      <h2>10. International</h2>
      <p>
        Servers may be outside your country. If you use Paymeify from India or
        elsewhere, you understand your data may be processed in regions where
        our hosts operate.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy. The “Last updated” date will change. The
        current version lives at www.paymeify.com/privacy.
      </p>
    </LegalDoc>
  );
}
