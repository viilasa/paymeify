"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  deleteProjectAction,
  regenerateTokenAction,
  updateProjectAction,
} from "@/app/(app)/projects/actions";
import { FormBanner } from "@/components/form-banner";
import { CurrencySelect } from "@/components/projects/currency-select";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { Project } from "@/lib/supabase/types";
import { useServerAction } from "@/lib/use-server-action";

export function ProjectSettingsForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(updateProjectAction, emptyActionState);
  const { pending, run } = useServerAction();
  const [confirm, setConfirm] = React.useState<"delete" | "regenerate" | null>(null);

  const lastMessage = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast.success(state.message);
    }
  }, [state.message]);

  return (
    <div className="space-y-10">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="project_id" value={project.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" htmlFor="name" error={state.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              defaultValue={project.name}
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Client name"
            htmlFor="client_name"
            error={state.fieldErrors?.client_name}
          >
            <Input
              id="client_name"
              name="client_name"
              defaultValue={project.client_name}
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Client email"
            htmlFor="client_email"
            error={state.fieldErrors?.client_email}
          >
            <Input
              id="client_email"
              name="client_email"
              type="email"
              defaultValue={project.client_email ?? ""}
            />
          </Field>

          <Field label="Currency" htmlFor="currency" error={state.fieldErrors?.currency}>
            <CurrencySelect defaultValue={project.currency} />
          </Field>

          <Field label="Start date" htmlFor="start_date" error={state.fieldErrors?.start_date}>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={project.start_date ?? ""}
            />
          </Field>

          <Field label="Due date" htmlFor="due_date" error={state.fieldErrors?.due_date}>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={project.due_date ?? ""}
            />
          </Field>

          <Field label="Status" htmlFor="status" error={state.fieldErrors?.status}>
            <Select name="status" defaultValue={project.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="description"
          error={state.fieldErrors?.description}
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={project.description ?? ""}
          />
        </Field>

        <FormBanner error={state.error} />

        <SubmitButton variant="primary" pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </form>

      <section className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="text-[13px] font-medium">Client link</h2>
        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
          Generating a new link immediately breaks the one you already shared. Use this
          if the link reached someone it should not have.
        </p>
        <Button
          className="mt-3"
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirm("regenerate")}
        >
          Generate new link
        </Button>
      </section>

      <section className="rounded-[10px] border border-danger/20 bg-card p-4">
        <h2 className="text-[13px] font-medium">Delete project</h2>
        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
          Deletes the project, its milestones, and its payment history. If you only want
          it out of the way, set the status to Archived instead.
        </p>
        <Button
          className="mt-3"
          variant="danger"
          disabled={pending}
          onClick={() => setConfirm("delete")}
        >
          Delete project
        </Button>
      </section>

      <ConfirmDialog
        open={confirm === "regenerate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Generate a new client link?"
        description="The current link stops working right away. You will need to send the new one to your client."
        confirmLabel="Generate new link"
        pending={pending}
        onConfirm={() =>
          run(
            regenerateTokenAction,
            { project_id: project.id },
            { onSuccess: () => setConfirm(null) },
          )
        }
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Delete "${project.name}"?`}
        description="This permanently removes the project, its milestones, and its payment records."
        confirmLabel="Delete project"
        destructive
        pending={pending}
        onConfirm={() => run(deleteProjectAction, { project_id: project.id })}
      />
    </div>
  );
}
