/**
 * Auth pages only ever show these fixed messages. Text from the URL is never
 * rendered, so a crafted link can't put its own words on the login page.
 */
const AUTH_ERRORS: Record<string, string> = {
  link_invalid: "That link is invalid or has expired.",
  auth_failed: "Sign-in did not complete. Try again.",
};

export function authErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return AUTH_ERRORS[code] ?? AUTH_ERRORS.auth_failed ?? null;
}
