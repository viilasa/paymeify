import Link from "next/link";

import { ClientProjectView } from "@/components/client-portal/client-project-view";
import { buildView, type PublicProject } from "@/lib/data/public-project";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Demo project link",
  description:
    "Preview the Paymeify client portal — milestones, UPI QR, and what your client sees when you share a project link. No account required.",
  path: "/demo",
});

/** Mirrors supabase/seed.sql so the demo matches local development data. */
const demoProject: PublicProject = {
  name: "ABC Studio Website",
  description:
    "Marketing site redesign and build — 6 pages, CMS, and launch support.",
  status: "active",
  currency: "INR",
  client_name: "Acme Coffee",
  start_date: null,
  due_date: null,
  business_name: "ABC Studio",
  // Not a real VPA — it renders a realistic QR, and any scan fails harmlessly
  // at the bank because the address does not exist.
  upi_id: "abcstudio@okhdfcbank",
  milestones: [
    {
      position: 1,
      title: "Discovery",
      description: "Kickoff workshop, sitemap, and content audit.",
      amount: 5000,
      status: "completed",
      payment_status: "paid",
      due_date: null,
      paid_at: null,
      payment_reported: false,
    },
    {
      position: 2,
      title: "Design",
      description: "Full visual design for all six pages, desktop and mobile.",
      amount: 10000,
      status: "completed",
      payment_status: "paid",
      due_date: null,
      paid_at: null,
      payment_reported: false,
    },
    {
      position: 3,
      title: "Development",
      description: "Next.js build, CMS wiring, and responsive QA.",
      amount: 15000,
      status: "in_progress",
      payment_status: "unpaid",
      due_date: null,
      paid_at: null,
      payment_reported: false,
    },
    {
      position: 4,
      title: "Launch",
      description: "Domain setup, analytics, and post-launch fixes.",
      amount: 15000,
      status: "pending",
      payment_status: "unpaid",
      due_date: null,
      paid_at: null,
      payment_reported: false,
    },
  ],
};

export default function DemoPage() {
  return (
    <>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-5 py-2.5">
          <p className="text-[12px] text-muted-foreground">
            Demo — this is the page your client opens.
          </p>
          <Link
            href="/signup"
            className="text-[12px] text-foreground underline underline-offset-4"
          >
            Start for free
          </Link>
        </div>
      </div>

      <ClientProjectView {...buildView(demoProject)} token="demo" demo />
    </>
  );
}
