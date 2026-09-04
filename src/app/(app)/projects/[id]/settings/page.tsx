import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ProjectSettingsForm } from "@/app/(app)/projects/[id]/settings/project-settings-form";
import { PageHeader } from "@/components/app/page-header";
import { getProjectDetail, isUuid } from "@/lib/data/projects";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <Link
        href={`/projects/${detail.project.id}`}
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to project
      </Link>

      <PageHeader title="Project settings" description={detail.project.name} />

      <ProjectSettingsForm project={detail.project} />
    </div>
  );
}
