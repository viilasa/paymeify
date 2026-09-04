import * as React from "react";

import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-foreground transition-colors duration-150 placeholder:text-subtle-foreground hover:border-border-strong focus:border-[#3a3a3a] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(fieldClasses, "h-9", className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClasses, "min-h-[72px] resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export { Input, Textarea };
