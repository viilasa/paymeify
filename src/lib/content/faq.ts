export type FaqItem = {
  question: string;
  answer: string;
};

/** Questions shown on the landing page and in its FAQ schema. */
export const landingFaqs: FaqItem[] = [
  {
    question: "What is Paymeify?",
    answer:
      "Paymeify is a milestone tracker and payment collector for freelancers. You create a project, break it into priced milestones, share one private link with your client, and get paid as you deliver. Clients never create an account.",
  },
  {
    question: "How do clients pay in India?",
    answer:
      "Add your UPI ID in Settings. The client portal shows a QR they can scan with GPay, PhonePe, Paytm, or any UPI app. Money lands in your bank. You confirm the transfer once you see it. For cards or automatic confirmation, connect Razorpay.",
  },
  {
    question: "Do clients need an account?",
    answer:
      "No. You send one private project link. The client opens it on a phone or laptop, sees progress and the amount due, and pays. There is no signup, login, or app to install.",
  },
  {
    question: "When does a milestone show as paid?",
    answer:
      "A client can never mark their own milestone paid. UPI and bank transfers wait for you to confirm. Razorpay payments flip to paid only after a verified webhook from Razorpay.",
  },
  {
    question: "Is Paymeify free to start?",
    answer:
      "Yes. Creating a project, sharing a client link, and collecting by UPI does not require a card. Razorpay is optional and uses your own Razorpay account.",
  },
];

/** Full FAQ for /faq, llms-full.txt, and FAQPage structured data. */
export const allFaqs: FaqItem[] = [
  ...landingFaqs,
  {
    question: "Who is Paymeify for?",
    answer:
      "Independent designers, developers, writers, consultants, and small studios who bill in milestones. It is built first for freelancers in India who collect over UPI, and it also works with Razorpay for cards and other currencies.",
  },
  {
    question: "Which payment methods does Paymeify support?",
    answer:
      "UPI QR codes for INR (GPay, PhonePe, Paytm, and any UPI app) and Razorpay Payment Links for cards and other currencies. You can also mark a milestone paid yourself after a bank transfer or cash.",
  },
  {
    question: "Does Paymeify work outside India?",
    answer:
      "Yes. The tracker and client portal work anywhere. UPI is INR-only. Projects in other currencies use Razorpay, or you mark payments received after an overseas transfer.",
  },
  {
    question: "Is the client link public?",
    answer:
      "No. Each project gets an unguessable token. Search engines are told not to index /p/ links. If a link leaks, you can regenerate it from project settings.",
  },
  {
    question: "What does the client see?",
    answer:
      "The project name, milestone list, amounts, what is paid, and what is due next — on one page that works on a phone. A static preview lives at /demo.",
  },
  {
    question: "Do I need Razorpay or a GST registration?",
    answer:
      "No. UPI collection needs only your UPI ID. Razorpay is optional and requires their KYC. Paymeify does not file GST or issue tax invoices.",
  },
];
