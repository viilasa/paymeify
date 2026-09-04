"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { addMilestoneAction, updateMilestoneAction } from "@/app/(app)/projects/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emptyActionState } from "@/lib/action-result";
import { currencySymbol } from "@/lib/format";
import type { Milestone } from "@/lib/supabase/types";

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currency: string;
  /** Omit to add a new milestone. */
  milestone?: Milestone;
}

export function MilestoneForm({
  open,
  onOpenChange,
  projectId,
  currency,
  milestone,
}: MilestoneFormProps) {
  const isEdit = Boolean(milestone);
  const [state, formAction] = useActionState(
    isEdit ? updateMilestoneAction : addMilestoneAction,
    emptyActionState,
  );

  const lastMessage = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast.success(state.message);
      onOpenChange(false);
    }
  }, [state.message, onOpenChange]);

  const amountLocked = milestone?.payment_status === "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit milestone" : "Add milestone"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes appear on your client's project link immediately."
              : "It will be added to the end of the timeline."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />
          {milestone ? (
            <input type="hidden" name="milestone_id" value={milestone.id} />
          ) : null}

          <Field label="Title" htmlFor="title" error={state.fieldErrors?.title}>
            <Input
              id="title"
              name="title"
              defaultValue={milestone?.title ?? ""}
              placeholder="Development"
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={milestone?.description ?? ""}
              rows={2}
              maxLength={500}
              placeholder="What this milestone covers."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={`Amount (${currencySymbol(currency)})`}
              htmlFor="amount"
              hint={amountLocked ? "Locked — already paid." : undefined}
              error={state.fieldErrors?.amount}
            >
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={milestone ? String(milestone.amount) : ""}
                readOnly={amountLocked}
                placeholder="15000"
                required
              />
            </Field>

            <Field label="Due date" htmlFor="due_date" error={state.fieldErrors?.due_date}>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                defaultValue={milestone?.due_date ?? ""}
              />
            </Field>
          </div>

          {isEdit ? (
            <Field label="Status" htmlFor="status">
              <Select name="status" defaultValue={milestone?.status ?? "pending"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <FormBanner error={state.error} />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton variant="primary" pendingLabel="Saving…">
              {isEdit ? "Save changes" : "Add milestone"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
