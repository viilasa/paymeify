"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { deleteMilestoneAction, reorderMilestonesAction } from "@/app/(app)/projects/actions";
import { EmptyState } from "@/components/empty-state";
import { MilestoneForm } from "@/components/projects/milestone-form";
import { MilestoneItem } from "@/components/projects/milestone-item";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { emptyActionState } from "@/lib/action-result";
import { currentOrder, milestoneOrderProblem } from "@/lib/milestone-order";
import type { Invoice, Milestone } from "@/lib/supabase/types";
import { useServerAction } from "@/lib/use-server-action";

interface MilestoneListProps {
  projectId: string;
  currency: string;
  milestones: Milestone[];
  /** Razorpay is configured, so payment links can be created. */
  paymentsEnabled: boolean;
  /** Milestones the client has reported a UPI transfer for, awaiting confirmation. */
  reportedMilestoneIds: string[];
  invoicesByMilestoneId?: Record<string, Invoice>;
  canEmailInvoice?: boolean;
}

type Editing = { mode: "add" } | { mode: "edit"; milestone: Milestone } | null;

export function MilestoneList({
  projectId,
  currency,
  milestones,
  paymentsEnabled,
  reportedMilestoneIds,
  invoicesByMilestoneId = {},
  canEmailInvoice = false,
}: MilestoneListProps) {
  const reported = React.useMemo(
    () => new Set(reportedMilestoneIds),
    [reportedMilestoneIds],
  );
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<Milestone | null>(null);
  const { pending, run } = useServerAction();

  // Local order so a drop renumbers instantly; resyncs whenever the server's
  // order changes (after the save, or another edit).
  const serverKey = currentOrder(milestones).join(",");
  const [order, setOrder] = React.useState<string[]>(() => serverKey.split(",").filter(Boolean));
  React.useEffect(() => setOrder(serverKey.split(",").filter(Boolean)), [serverKey]);
  const [saving, startSaving] = React.useTransition();

  const byId = React.useMemo(() => new Map(milestones.map((m) => [m.id, m])), [milestones]);
  const ordered = order.flatMap((id) => {
    const milestone = byId.get(id);
    return milestone ? [milestone] : [];
  });

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so taps still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const dndId = React.useId();

  const titleOf = (id: string | number) => byId.get(String(id))?.title ?? "Milestone";
  const numberOf = (id: string | number) => order.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, number ${numberOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over number ${numberOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} dropped at number ${numberOf(over.id)}.` : "Dropped.",
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} was not moved.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const next = arrayMove(order, from, to);
    const problem = milestoneOrderProblem(milestones, next);
    if (problem) {
      toast.error(problem);
      return;
    }

    const previous = order;
    setOrder(next);
    startSaving(async () => {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("order", JSON.stringify(next));
      const result = await reorderMilestonesAction(emptyActionState, formData);
      if (result?.error) {
        setOrder(previous);
        toast.error(result.error);
      }
    });
  }

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
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "To reorder, press space or enter to pick up this milestone, use the arrow keys to move it, then press space or enter to drop it. Press escape to cancel.",
            },
          }}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul
              aria-busy={saving}
              className="divide-y divide-[#242424] rounded-[10px] border border-border bg-card"
            >
              {ordered.map((milestone, index) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  displayPosition={index + 1}
                  projectId={projectId}
                  currency={currency}
                  isFirst={index === 0}
                  isLast={index === ordered.length - 1}
                  paymentsEnabled={paymentsEnabled}
                  paymentReported={reported.has(milestone.id)}
                  invoice={invoicesByMilestoneId[milestone.id] ?? null}
                  canEmailInvoice={canEmailInvoice}
                  onEdit={() => setEditing({ mode: "edit", milestone })}
                  onDelete={() => setDeleting(milestone)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {ordered.length > 1 ? (
        <p className="text-[11px] text-subtle-foreground">
          Drag the handle to reorder. Paid milestones and ones with an open checkout keep
          their number.
        </p>
      ) : null}

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
