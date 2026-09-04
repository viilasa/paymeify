"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { currencySymbol, formatMoney, formatPosition } from "@/lib/format";

export interface MilestoneDraft {
  key: string;
  title: string;
  description: string;
  amount: string;
  due_date: string;
}

export function emptyDraft(): MilestoneDraft {
  return {
    key: Math.random().toString(36).slice(2),
    title: "",
    description: "",
    amount: "",
    due_date: "",
  };
}

/** `"5,000"` -> `5000`; anything unparseable becomes null so Zod can flag it. */
export function draftAmount(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

export function serialiseDrafts(drafts: MilestoneDraft[]) {
  return drafts.map((draft) => ({
    title: draft.title,
    description: draft.description,
    amount: draftAmount(draft.amount),
    due_date: draft.due_date,
  }));
}

interface MilestoneDraftListProps {
  drafts: MilestoneDraft[];
  onChange: (drafts: MilestoneDraft[]) => void;
  currency: string;
  fieldErrors?: Record<string, string>;
}

export function MilestoneDraftList({
  drafts,
  onChange,
  currency,
  fieldErrors,
}: MilestoneDraftListProps) {
  const total = drafts.reduce((sum, draft) => sum + (draftAmount(draft.amount) ?? 0), 0);

  function update(index: number, patch: Partial<MilestoneDraft>) {
    onChange(drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  }

  function remove(index: number) {
    onChange(drafts.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft, index) => (
        <div key={draft.key} className="rounded-[10px] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-subtle-foreground">
              {formatPosition(index + 1)}
            </span>
            {drafts.length > 1 ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove milestone ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Title"
              htmlFor={`m-title-${draft.key}`}
              error={fieldErrors?.[`milestones.${index}.title`]}
            >
              <Input
                id={`m-title-${draft.key}`}
                value={draft.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Design"
                maxLength={120}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={`Amount (${currencySymbol(currency)})`}
                htmlFor={`m-amount-${draft.key}`}
                error={fieldErrors?.[`milestones.${index}.amount`]}
              >
                <Input
                  id={`m-amount-${draft.key}`}
                  value={draft.amount}
                  onChange={(event) => update(index, { amount: event.target.value })}
                  inputMode="decimal"
                  placeholder="10000"
                />
              </Field>

              <Field
                label="Due date"
                htmlFor={`m-due-${draft.key}`}
                error={fieldErrors?.[`milestones.${index}.due_date`]}
              >
                <Input
                  id={`m-due-${draft.key}`}
                  type="date"
                  value={draft.due_date}
                  onChange={(event) => update(index, { due_date: event.target.value })}
                />
              </Field>
            </div>
          </div>

          <div className="mt-3">
            <Field
              label="Description"
              htmlFor={`m-desc-${draft.key}`}
              error={fieldErrors?.[`milestones.${index}.description`]}
            >
              <Textarea
                id={`m-desc-${draft.key}`}
                value={draft.description}
                onChange={(event) => update(index, { description: event.target.value })}
                placeholder="What this milestone covers. Your client sees this."
                rows={2}
                maxLength={500}
              />
            </Field>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => onChange([...drafts, emptyDraft()])}>
          <Plus />
          Add milestone
        </Button>
        <p className="text-[12px] text-muted-foreground">
          Total project value{" "}
          <span className="tabular ml-1 text-[13px] font-medium text-foreground">
            {formatMoney(total, currency)}
          </span>
        </p>
      </div>
    </div>
  );
}
