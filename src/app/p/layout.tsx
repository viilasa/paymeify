import type { Metadata } from "next";

import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
