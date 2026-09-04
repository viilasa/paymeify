import type { Metadata } from "next";

import { NewProjectForm } from "@/app/(app)/projects/new/new-project-form";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="New project"
        description="Add your client and break the work into milestones."
      />
      <NewProjectForm />
    </div>
  );
}
