import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
