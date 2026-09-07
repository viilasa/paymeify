"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
  toastMessage?: string;
  /** Icon-only control (e.g. next to a link). */
  iconOnly?: boolean;
}

export function CopyButton({
  value,
  label = "Copy",
  toastMessage = "Copied to clipboard",
  iconOnly = false,
  className,
  size,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastMessage);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Copy the link manually.");
    }
  }

  return (
    <Button
      onClick={copy}
      aria-label={label}
      size={iconOnly ? "icon" : size}
      className={cn(iconOnly && "size-8 shrink-0", className)}
      {...props}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {iconOnly ? null : label}
    </Button>
  );
}
