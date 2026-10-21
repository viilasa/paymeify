"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { currencySymbol, formatMoney, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const dndId = React.useId();

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = drafts.findIndex((d) => d.key === active.id);
    const to = drafts.findIndex((d) => d.key === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(drafts, from, to));
  }

  return (
    <div className="space-y-3">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={drafts.map((d) => d.key)} strategy={verticalListSortingStrategy}>
          {drafts.map((draft, index) => (
            <SortableDraft key={draft.key} id={draft.key} title={draft.title} index={index}>
              {(handle) => (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {drafts.length > 1 ? handle : null}
                      <span className="font-mono text-[11px] text-subtle-foreground">
                        {formatPosition(index + 1)}
                      </span>
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
                </>
              )}
            </SortableDraft>
          ))}
        </SortableContext>
      </DndContext>

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

/** One draggable draft card; `children` receives the drag handle to place. */
function SortableDraft({
  id,
  title,
  index,
  children,
}: {
  id: string;
  title: string;
  index: number;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${title || `milestone ${index + 1}`}`}
      title="Drag to reorder"
      className="-my-1 -ml-1.5 flex size-7 touch-none cursor-grab items-center justify-center rounded-[6px] text-subtle-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "rounded-[10px] border border-border bg-card p-4",
        isDragging && "relative z-10 shadow-lg shadow-black/40 ring-1 ring-border-strong",
      )}
    >
      {children(handle)}
    </div>
  );
}
