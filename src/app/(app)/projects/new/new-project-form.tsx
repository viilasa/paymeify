"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { createProjectAction } from "@/app/(app)/projects/actions";
import { FormBanner } from "@/components/form-banner";
import { CurrencySelect } from "@/components/projects/currency-select";
import {
  MilestoneDraftList,
  emptyDraft,
  serialiseDrafts,
  type MilestoneDraft,
} from "@/components/projects/milestone-draft-list";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { emptyActionState } from "@/lib/action-result";

const starterDrafts: MilestoneDraft[] = [
  { ...emptyDraft(), title: "Discovery" },
  { ...emptyDraft(), title: "Design" },
];

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProjectAction, emptyActionState);
  const [drafts, setDrafts] = React.useState<MilestoneDraft[]>(starterDrafts);
  const [currency, setCurrency] = React.useState("INR");

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" htmlFor="name" error={state.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              placeholder="ABC Studio Website"
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
              placeholder="Acme Coffee"
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Client email"
            htmlFor="client_email"
            hint="We'll email the project link when you create it, and when a milestone is ready to pay."
            error={state.fieldErrors?.client_email}
          >
            <Input
              id="client_email"
              name="client_email"
              type="email"
              placeholder="hello@acmecoffee.com"
            />
          </Field>

          <Field
            label="Client phone"
            htmlFor="client_phone"
            hint="Optional. SMS uses this number. Country code defaults to India."
            error={state.fieldErrors?.client_phone}
          >
            <PhoneInput />
          </Field>

          <Field label="Currency" htmlFor="currency" error={state.fieldErrors?.currency}>
            <CurrencySelect onValueChange={setCurrency} />
          </Field>

          <Field label="Start date" htmlFor="start_date" error={state.fieldErrors?.start_date}>
            <Input id="start_date" name="start_date" type="date" />
          </Field>

          <Field label="Due date" htmlFor="due_date" error={state.fieldErrors?.due_date}>
            <Input id="due_date" name="due_date" type="date" />
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="description"
          hint="Shown to your client at the top of the project link."
          error={state.fieldErrors?.description}
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            placeholder="Marketing site redesign and build — 6 pages, CMS, and launch support."
          />
        </Field>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[13px] font-medium">Milestones</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Your client pays these one at a time, in order.
          </p>
        </div>

        <MilestoneDraftList
          drafts={drafts}
          onChange={setDrafts}
          currency={currency}
          fieldErrors={state.fieldErrors}
        />
      </section>

      <input
        type="hidden"
        name="milestones"
        value={JSON.stringify(serialiseDrafts(drafts))}
      />

      <FormBanner error={state.error} />

      {state.code === "trial_limit" ? (
        <p className="text-[13px] text-muted-foreground">
          <Link href="/#pricing" className="font-medium text-foreground underline-offset-2 hover:underline">
            View pricing
          </Link>{" "}
          to upgrade to Pro.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <SubmitButton variant="primary" pendingLabel="Creating…">
          Create Project
        </SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/projects">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
