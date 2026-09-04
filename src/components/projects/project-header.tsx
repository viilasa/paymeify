import Link from "next/link";
import { Settings2 } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/supabase/types";

export function ProjectHeader({
  project,
  portalUrl,
}: {
  project: Project;
  portalUrl: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-[18px] font-medium tracking-tight">
            {project.name}
          </h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">{project.client_name}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <CopyButton
          value={portalUrl}
          label="Copy Client Link"
          toastMessage="Client link copied"
        />
        <Button asChild variant="secondary">
          <Link href={`/projects/${project.id}/settings`}>
            <Settings2 />
            Edit Project
          </Link>
        </Button>
      </div>
    </div>
  );
}
