import { z } from "zod";

import { computeTotals, findCurrentMilestone, type ProjectTotals } from "@/lib/progress";
import { createSupabaseAnonClient } from "@/lib/supabase/server";

/**
 * The client-facing shape of a project. Deliberately free of internal ids:
 * clients address milestones by their position number.
 */
const publicMilestoneSchema = z.object({
  position: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "in_progress", "completed"]),
  payment_status: z.enum(["unpaid", "pending", "paid", "failed"]),
  due_date: z.string().nullable(),
  paid_at: z.string().nullable(),
});

const publicProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "completed", "archived"]),
  currency: z.string(),
  client_name: z.string(),
  start_date: z.string().nullable(),
  due_date: z.string().nullable(),
  business_name: z.string(),
  milestones: z.array(publicMilestoneSchema),
});

export type PublicMilestone = z.infer<typeof publicMilestoneSchema>;
export type PublicProject = z.infer<typeof publicProjectSchema>;

export interface PublicProjectView {
  project: PublicProject;
  milestones: PublicMilestone[];
  totals: ProjectTotals;
  /** Lowest-positioned unpaid milestone, if any. */
  current: PublicMilestone | undefined;
}

/** Tokens are 40 hex characters; anything else is rejected before hitting the DB. */
export function isValidToken(token: string): boolean {
  return /^[0-9a-f]{20,64}$/i.test(token);
}

export async function getPublicProject(token: string): Promise<PublicProjectView | null> {
  if (!isValidToken(token)) return null;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("get_project_by_token", { p_token: token });

  if (error) {
    console.error("get_project_by_token failed", error);
    return null;
  }
  if (!data) return null;

  const parsed = publicProjectSchema.safeParse(data);
  if (!parsed.success) {
    console.error("get_project_by_token returned an unexpected shape", parsed.error);
    return null;
  }

  return buildView(parsed.data);
}

export function buildView(project: PublicProject): PublicProjectView {
  const milestones = [...project.milestones].sort((a, b) => a.position - b.position);

  return {
    project,
    milestones,
    totals: computeTotals(milestones),
    current: findCurrentMilestone(milestones),
  };
}
