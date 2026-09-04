/** Shared shape returned by every server action driving a form. */
export interface ActionState {
  error?: string;
  message?: string;
  /** Field-level messages keyed by input name. */
  fieldErrors?: Record<string, string>;
}

export const emptyActionState: ActionState = {};

export function failure(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { error, ...(fieldErrors ? { fieldErrors } : {}) };
}

export function success(message: string): ActionState {
  return { message };
}

/**
 * Turns anything thrown inside an action into a message safe to show a user.
 * Stack traces stay in the server logs.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return fallback;
}

/** An error whose message is intentionally user-facing. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
