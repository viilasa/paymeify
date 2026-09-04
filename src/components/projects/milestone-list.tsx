"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { deleteMilestoneAction } from "@/app/(app)/projects/actions";
import { EmptyState } from "@/components/empty-state";
import { MilestoneForm } from "@/components/projects/milestone-form";
import { MilestoneItem } from "@/components/projects/milestone-item";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Milestone } from "@/lib/supabase/types";
import { useServerAction } from "@/lib/use-server-action";

interface MilestoneListProps {
  projectId: string;
  currency: string;
  milestones: Milestone[];
  paymentsEnabled: boolean;
}

type Editing = { mode: "add" } | { mode: "edit"; milestone: Milestone } | null;

export function MilestoneList({
  projectId,
  currency,
  milestones,
  paymentsEnabled,
}: MilestoneListProps) {
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<Milestone | null>(null);
  const { pending, run } = useServerAction();

  function confirmDelete() {
    if (!deleting) return;
    run(
      deleteMilestoneAction,
      { project_id: projectId, milestone_id: deleting.id },
      { onSuccess: () => setDeleting(null) },
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium">Milestones</h2>
        <Button size="sm" variant="secondary" onClick={() => setEditing({ mode: "add" })}>
          <Plus />
          Add milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet."
          description="Add the first milestone so your client knows what they are paying for."
          action={
            <Button variant="primary" onClick={() => setEditing({ mode: "add" })}>
              Add milestone
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-[#242424] overflow-hidden rounded-[10px] border border-border bg-card">
          {milestones.map((milestone, index) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              projectId={projectId}
              currency={currency}
              isFirst={index === 0}
              isLast={index === milestones.length - 1}
              paymentsEnabled={paymentsEnabled}
              onEdit={() => setEditing({ mode: "edit", milestone })}
              onDelete={() => setDeleting(milestone)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <MilestoneForm
          key={editing.mode === "edit" ? editing.milestone.id : "add"}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          projectId={projectId}
          currency={currency}
          milestone={editing.mode === "edit" ? editing.milestone : undefined}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Delete "${deleting?.title ?? ""}"?`}
        description="This removes the milestone from your client's project link. It cannot be undone."
        confirmLabel="Delete milestone"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
