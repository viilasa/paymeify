import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientProjectView } from "@/components/client-portal/client-project-view";
import { getPublicProject } from "@/lib/data/public-project";
import { isRazorpayConfigured } from "@/lib/env";
import { noIndexRobots } from "@/lib/seo";

export const dynamic = "force-dynamic";

// A private link should never end up in a search index or sitemap.
export const metadata: Metadata = {
  title: "Project",
  robots: noIndexRobots,
};

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ token }, { paid }] = await Promise.all([params, searchParams]);

  const view = await getPublicProject(token);
  if (!view) notFound();

  const returnedFrom = paid && /^\d{1,4}$/.test(paid) ? Number(paid) : undefined;

  return (
    <ClientProjectView
      {...view}
      token={token}
      returnedFrom={returnedFrom}
      razorpayEnabled={isRazorpayConfigured()}
    />
  );
}
