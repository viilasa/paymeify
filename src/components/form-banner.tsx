/** Inline result message for a form. Error takes precedence over success. */
export function FormBanner({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;

  return (
    <p
      role="status"
      className={
        error
          ? "rounded-[8px] border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] text-danger"
          : "rounded-[8px] border border-success/20 bg-success-muted px-3 py-2 text-[12px] text-success"
      }
    >
      {error ?? message}
    </p>
  );
}
