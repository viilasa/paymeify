"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  pendingLabel?: string;
  /** For forms submitted via onSubmit, where useFormStatus can't see the request. */
  pending?: boolean;
}

/** Submit button that disables itself while its parent form is in flight. */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  pending: pendingProp,
  ...props
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
