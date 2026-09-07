import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Milestone, Payment, Project } from "@/lib/supabase/types";
import { computeTotals, type ProjectTotals } from "@/lib/progress";

export interface ProjectWithTotals {
  project: Project;
  milestones: Milestone[];
  totals: ProjectTotals;
  /** Client-reported UPI transfers waiting on the freelancer. */
  pendingReports: number;
}

export interface PendingPaymentReport {
  paymentId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  currency: string;
  reference: string | null;
  reportedAt: string;
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

  const { data: pending } = await supabase
    .from("payments")
    .select("project_id")
    .eq("gateway", "upi")
    .eq("status", "pending")
    .in(
      "project_id",
      projects.map((p) => p.id),
    );

  const pendingByProject = new Map<string, number>();
  for (const row of pending ?? []) {
    pendingByProject.set(row.project_id, (pendingByProject.get(row.project_id) ?? 0) + 1);
  }

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
      pendingReports: pendingByProject.get(project.id) ?? 0,
    };
  });
}

/** UPI transfers clients reported, not yet confirmed against the bank. */
export async function listPendingPaymentReports(): Promise<PendingPaymentReport[]> {
  const supabase = await createSupabaseServerClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, project_id, milestone_id, amount, currency, gateway_payment_id, created_at")
    .eq("gateway", "upi")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!payments?.length) return [];

  const milestoneIds = payments
    .map((row) => row.milestone_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: projects }, { data: milestones }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, client_name, currency")
      .in("id", [...new Set(payments.map((row) => row.project_id))]),
    milestoneIds.length
      ? supabase.from("milestones").select("id, title").in("id", milestoneIds)
      : Promise.resolve({ data: [] }),
  ]);

  const projectById = new Map((projects ?? []).map((row) => [row.id, row]));
  const milestoneById = new Map((milestones ?? []).map((row) => [row.id, row]));

  const reports: PendingPaymentReport[] = [];
  for (const payment of payments) {
    if (!payment.milestone_id) continue;
    const project = projectById.get(payment.project_id);
    const milestone = milestoneById.get(payment.milestone_id);
    if (!project || !milestone) continue;

    reports.push({
      paymentId: payment.id,
      projectId: project.id,
      projectName: project.name,
      clientName: project.client_name,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      amount: Number(payment.amount),
      currency: payment.currency || project.currency,
      reference: payment.gateway_payment_id,
      reportedAt: payment.created_at,
    });
  }

  return reports;
}

export const countPendingPaymentReports = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("gateway", "upi")
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
});

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
    pendingReports: (payments ?? []).filter(
      (row) => row.gateway === "upi" && row.status === "pending",
    ).length,
    payments: payments ?? [],
  };
}

/** Guards against a malformed id reaching Postgres as a bad uuid cast. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
