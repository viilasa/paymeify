import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Milestone, Payment, Project } from "@/lib/supabase/types";
import { computeTotals, type ProjectTotals } from "@/lib/progress";

export interface ProjectWithTotals {
  project: Project;
  milestones: Milestone[];
  totals: ProjectTotals;
}

export interface DashboardSummary {
  activeProjects: number;
  outstanding: number;
  collected: number;
  /** Currency of the majority of projects, used for the summary figures. */
  currency: string;
}

function byPosition(a: Milestone, b: Milestone): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
}

/** All of the signed-in freelancer's projects, each with its milestones. */
export async function listProjects(): Promise<ProjectWithTotals[]> {
  const supabase = await createSupabaseServerClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!projects?.length) return [];

  const { data: milestones, error: milestoneError } = await supabase
    .from("milestones")
    .select("*")
    .in(
      "project_id",
      projects.map((p) => p.id),
    );

  if (milestoneError) throw new Error(milestoneError.message);

  const grouped = new Map<string, Milestone[]>();
  for (const milestone of milestones ?? []) {
    const list = grouped.get(milestone.project_id);
    if (list) list.push(milestone);
    else grouped.set(milestone.project_id, [milestone]);
  }

  return projects.map((project) => {
    const projectMilestones = (grouped.get(project.id) ?? []).sort(byPosition);
    return {
      project,
      milestones: projectMilestones,
      totals: computeTotals(projectMilestones),
    };
  });
}

export function summarise(projects: ProjectWithTotals[]): DashboardSummary {
  let outstanding = 0;
  let collected = 0;
  let activeProjects = 0;
  const currencyCounts = new Map<string, number>();

  for (const { project, totals } of projects) {
    if (project.status === "archived") continue;
    if (project.status === "active") activeProjects += 1;
    outstanding += totals.remaining;
    collected += totals.paid;
    currencyCounts.set(project.currency, (currencyCounts.get(project.currency) ?? 0) + 1);
  }

  let currency = "INR";
  let best = 0;
  for (const [code, count] of currencyCounts) {
    if (count > best) {
      best = count;
      currency = code;
    }
  }

  return { activeProjects, outstanding, collected, currency };
}

export interface ProjectDetail extends ProjectWithTotals {
  payments: Payment[];
}

/** One project owned by the signed-in freelancer, or null. */
export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!project) return null;

  const [{ data: milestones }, { data: payments }] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", project.id),
    supabase
      .from("payments")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  const sorted = (milestones ?? []).sort(byPosition);

  return {
    project,
    milestones: sorted,
    totals: computeTotals(sorted),
    payments: payments ?? [],
  };
}

/** Guards against a malformed id reaching Postgres as a bad uuid cast. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
