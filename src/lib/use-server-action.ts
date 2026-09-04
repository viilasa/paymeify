"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { emptyActionState, type ActionState } from "@/lib/action-result";

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Calls a server action from an event handler, surfaces its result as a toast,
 * and exposes a pending flag for disabling controls.
 */
export function useServerAction() {
  const [pending, startTransition] = useTransition();

  function run(
    action: ServerAction,
    fields: Record<string, string>,
    options?: { onSuccess?: () => void; silent?: boolean },
  ) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);

    startTransition(async () => {
      const result = await action(emptyActionState, formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.message && !options?.silent) toast.success(result.message);
      options?.onSuccess?.();
    });
  }

  return { pending, run };
}
