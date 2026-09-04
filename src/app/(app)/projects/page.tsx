import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/empty-state";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await listProjects();
  const active = projects.filter((p) => p.project.status !== "archived");
  const archived = projects.filter((p) => p.project.status === "archived");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description={
          projects.length
            ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
            : undefined
        }
        actions={
          <Button asChild variant="primary">
            <Link href="/projects/new">+ New Project</Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet."
          description="Create a project, add milestones, and share one link with your client."
          action={
            <Button asChild variant="primary">
              <Link href="/projects/new">Create your first project</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? <ProjectList projects={active} /> : null}

          {archived.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[13px] font-medium text-muted-foreground">Archived</h2>
              <ProjectList projects={archived} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
