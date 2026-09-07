import Link from "next/link";
import { Settings2 } from "lucide-react";

import { RemindClientButton } from "@/components/projects/remind-client-button";
import { SendInvoiceButton } from "@/components/projects/send-invoice-button";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/supabase/types";

export function ProjectHeader({
  project,
  hasUnpaidInvoiceable,
}: {
  project: Project;
  hasUnpaidInvoiceable?: boolean;
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

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <SendInvoiceButton
          projectId={project.id}
          disabled={!hasUnpaidInvoiceable || !project.client_email}
        />
        <RemindClientButton
          projectId={project.id}
          disabled={!project.client_email && !project.client_phone}
        />
        <Button asChild variant="secondary" className="h-11 w-full sm:h-8 sm:w-auto">
          <Link href={`/projects/${project.id}/settings`}>
            <Settings2 />
            Edit Project
          </Link>
        </Button>
      </div>
    </div>
  );
}
