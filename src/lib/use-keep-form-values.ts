"use client";

import * as React from "react";

/**
 * Submits a form to a `useActionState` dispatcher without React 19's automatic
 * form reset, so a server-side validation error doesn't wipe what was typed.
 * Spread `onSubmit` on the <form> instead of passing `action`.
 */
export function useKeepFormValues(dispatch: (formData: FormData) => void) {
  const [pending, startTransition] = React.useTransition();

  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const formData = new FormData(event.currentTarget, submitter);
      startTransition(() => dispatch(formData));
    },
    [dispatch],
  );

  return { onSubmit, pending };
}
