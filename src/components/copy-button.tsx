"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label: string;
  toastMessage?: string;
}

export function CopyButton({
  value,
  label,
  toastMessage = "Copied to clipboard",
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
    <Button onClick={copy} {...props}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {label}
    </Button>
  );
}
