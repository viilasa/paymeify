import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientProjectView } from "@/components/client-portal/client-project-view";
import { getPublicProject } from "@/lib/data/public-project";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const view = await getPublicProject(token);
  const robots = { index: false, follow: false } as const;

  if (!view) return { robots };

  const title = view.project.name;
  const description = view.project.description
    ? `${view.project.business_name} · ${view.project.description}`
    : `${view.project.business_name} shared a project link on Paymeify.`;

  return {
    title,
    description,
    robots,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    paid?: string;
    /** Dodo appends status=succeeded|failed|cancelled to the return URL. */
    status?: string;
    /** Razorpay appends this to a payment link's callback URL. */
    razorpay_payment_link_status?: string;
  }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const { paid } = query;
  const gatewayStatus = (query.status ?? query.razorpay_payment_link_status ?? "").toLowerCase();
  const returnFailed = ["failed", "cancelled", "canceled", "expired"].includes(gatewayStatus);

  const view = await getPublicProject(token);
  if (!view) notFound();

  const returnedFrom = paid && /^\d{1,4}$/.test(paid) ? Number(paid) : undefined;

  return (
    <ClientProjectView
      {...view}
      token={token}
      returnedFrom={returnedFrom}
      returnFailed={returnFailed}
      autoPay={Boolean(view.project.auto_pay)}
    />
  );
}
