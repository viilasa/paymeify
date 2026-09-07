"use client";

import { Bell } from "lucide-react";

import { remindClientAction } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/lib/use-server-action";

export function RemindClientButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const { pending, run } = useServerAction();

  return (
    <Button
      variant="secondary"
      className="h-11 w-full sm:h-8 sm:w-auto"
      disabled={pending || disabled}
      onClick={() => run(remindClientAction, { project_id: projectId })}
    >
      <Bell />
      Remind to pay
    </Button>
  );
}
