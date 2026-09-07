"use client";

import { FileText } from "lucide-react";

import { sendInvoiceAction } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/lib/use-server-action";

export function SendInvoiceButton({
  projectId,
  milestoneId,
  disabled,
  label = "Send invoice",
  size = "default",
}: {
  projectId: string;
  milestoneId?: string;
  disabled?: boolean;
  label?: string;
  size?: "default" | "sm";
}) {
  const { pending, run } = useServerAction();

  return (
    <Button
      variant={size === "sm" ? "secondary" : "primary"}
      size={size === "sm" ? "sm" : undefined}
      className={size === "default" ? "h-11 w-full sm:h-8 sm:w-auto" : undefined}
      disabled={pending || disabled}
      onClick={() =>
        run(sendInvoiceAction, {
          project_id: projectId,
          ...(milestoneId ? { milestone_id: milestoneId } : {}),
        })
      }
    >
      <FileText />
      {label}
    </Button>
  );
}
