"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError, failure, success, toUserMessage, type ActionState } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { isUuid } from "@/lib/data/projects";
import { resendApiKey } from "@/lib/env";
import {
  ensureInvoiceForMilestone,
  invoicePublicUrl,
  markInvoiceSent,
} from "@/lib/invoices";
import { emailPaidInvoiceReceipt } from "@/lib/invoice-mail";
import { notifyClient, recentlyReminded } from "@/lib/notify";
import { composePhone, DEFAULT_DIAL_CODE, normalizePhone } from "@/lib/phone";
import {
  ensureMilestonePaymentLink,
  releaseMilestonePaymentLink,
  reopenMilestone,
  settleMilestoneManually,
} from "@/lib/payments";
import { canCreateProject, TRIAL_PROJECT_LIMIT_MESSAGE } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Milestone, Project } from "@/lib/supabase/types";
import {
  createProjectSchema,
  fieldErrorsFrom,
  milestoneInputSchema,
  milestoneStatusSchema,
  parseAmount,
  projectSettingsSchema,
} from "@/lib/validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Loads a project the signed-in user owns, or throws a user-facing error. */
async function requireOwnedProject(projectId: unknown): Promise<Project> {
  if (typeof projectId !== "string" || !isUuid(projectId)) {
    throw new AppError("That project could not be found.");
  }

  await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new AppError("Could not load that project.");
  if (!data) throw new AppError("That project could not be found.");
  return data;
}

async function requireOwnedMilestone(
  projectId: unknown,
  milestoneId: unknown,
): Promise<{ project: Project; milestone: Milestone }> {
  const project = await requireOwnedProject(projectId);

  if (typeof milestoneId !== "string" || !isUuid(milestoneId)) {
    throw new AppError("That milestone could not be found.");
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!data) throw new AppError("That milestone could not be found.");
  return { project, milestone: data };
}

function revalidateProject(projectId: string, publicToken?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  if (publicToken) {
    revalidatePath(`/p/${publicToken}`);
    revalidatePath(`/p/${publicToken}`, "layout");
  }
}

async function sendInvoiceForMilestone(input: {
  project: Project;
  milestone: Milestone;
  profile: { name: string; business_name: string | null };
}): Promise<{ emailed: boolean; number: string; invoiceUrl: string; error?: string }> {
  const supabase = await createSupabaseServerClient();

  let invoice;
  try {
    invoice = await ensureInvoiceForMilestone({
      db: supabase,
      project: input.project,
      milestone: input.milestone,
      profile: input.profile,
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Could not create the invoice. Run the invoices migration in Supabase if you have not.";
    return { emailed: false, number: "", invoiceUrl: "", error: message };
  }

  const invoiceUrl = invoicePublicUrl(input.project, input.milestone.position);

  if (!input.project.client_email?.trim()) {
    return {
      emailed: false,
      number: invoice.number,
      invoiceUrl,
      error: "Add a client email in project settings to email the invoice.",
    };
  }

  if (!resendApiKey()) {
    return {
      emailed: false,
      number: invoice.number,
      invoiceUrl,
      error: "RESEND_API_KEY is not set on this deployment (Vercel env).",
    };
  }

  const sent = await notifyClient({
    db: supabase,
    project: input.project,
    profile: input.profile,
    kind: "invoice_sent",
    milestone: input.milestone,
    invoice,
    skipSms: true,
  });

  if (sent.email) {
    await markInvoiceSent(supabase, invoice.id);
    return { emailed: true, number: invoice.number, invoiceUrl };
  }

  return {
    emailed: false,
    number: invoice.number,
    invoiceUrl,
    error: sent.error ?? "Resend did not accept the email. Check the from address is verified.",
  };
}

async function notifyMilestoneCompletedOrInvoice(input: {
  project: Project;
  milestone: Milestone;
  profile: { name: string; business_name: string | null };
}): Promise<{ message?: string; error?: string }> {
  // Due invoices are sent only via "Send invoice". Completing a milestone
  // just notifies the client that work is ready.
  const supabase = await createSupabaseServerClient();
  await notifyClient({
    db: supabase,
    project: input.project,
    profile: input.profile,
    kind: "milestone_completed",
    milestone: input.milestone,
  });
  return { message: "Milestone completed." };
}

function readClientPhone(formData: FormData) {
  const code = String(formData.get("client_phone_code") ?? "");
  const national = String(formData.get("client_phone_number") ?? "");
  if (code || national) return composePhone(code || DEFAULT_DIAL_CODE, national);
  return String(formData.get("client_phone") ?? "");
}

function readProjectFields(formData: FormData) {
  return {
    name: formData.get("name"),
    client_name: formData.get("client_name"),
    client_email: formData.get("client_email") ?? "",
    client_phone: readClientPhone(formData),
    description: formData.get("description") ?? "",
    currency: formData.get("currency"),
    start_date: formData.get("start_date") ?? "",
    due_date: formData.get("due_date") ?? "",
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let newProjectId: string;

  try {
    const { user, profile } = await requireSession();

    const rawMilestones = formData.get("milestones");
    let milestones: unknown = [];
    try {
      milestones = JSON.parse(typeof rawMilestones === "string" ? rawMilestones : "[]");
    } catch {
      throw new AppError("Milestones could not be read. Refresh and try again.");
    }

    const parsed = createProjectSchema.safeParse({
      ...readProjectFields(formData),
      milestones,
    });

    if (!parsed.success) {
      const fieldErrors = fieldErrorsFrom(parsed.error);
      return failure(
        fieldErrors["milestones"] ?? "Check the highlighted fields.",
        fieldErrors,
      );
    }

    const { milestones: milestoneInput, ...projectInput } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { count: projectCount, error: countError } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      throw new AppError("Could not create the project. Try again.");
    }

    if (!canCreateProject(profile.plan, projectCount ?? 0)) {
      return failure(TRIAL_PROJECT_LIMIT_MESSAGE, undefined, "trial_limit");
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({ ...projectInput, user_id: user.id, status: "active" })
      .select("*")
      .single();

    if (error || !project) {
      throw new AppError("Could not create the project. Try again.");
    }

    const { error: milestoneError } = await supabase.from("milestones").insert(
      milestoneInput.map((milestone, index) => ({
        project_id: project.id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        due_date: milestone.due_date,
        position: index + 1,
        status: index === 0 ? ("in_progress" as const) : ("pending" as const),
      })),
    );

    if (milestoneError) {
      await supabase.from("projects").delete().eq("id", project.id);
      throw new AppError("Could not save the milestones. Try again.");
    }

    await notifyClient({
      db: supabase,
      project,
      profile,
      kind: "project_created",
    });

    revalidateProject(project.id, project.public_token);
    newProjectId = project.id;
  } catch (error) {
    return failure(toUserMessage(error, "Could not create the project. Try again."));
  }

  redirect(`/projects/${newProjectId}`);
}

export async function updateProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));

    const parsed = projectSettingsSchema.safeParse({
      ...readProjectFields(formData),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("projects")
      .update(parsed.data)
      .eq("id", project.id);

    if (error) throw new AppError("Could not save your changes.");

    revalidateProject(project.id, project.public_token);
    return success("Project updated.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not save your changes."));
  }
}

export async function deleteProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) throw new AppError("Could not delete the project.");

    revalidateProject(project.id, project.public_token);
  } catch (error) {
    return failure(toUserMessage(error, "Could not delete the project."));
  }

  redirect("/projects");
}

/** Invalidates the shared client link and issues a new one. */
export async function regenerateTokenAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));
    const token =
      crypto.randomUUID().replaceAll("-", "") +
      crypto.randomUUID().replaceAll("-", "").slice(0, 8);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("projects")
      .update({ public_token: token })
      .eq("id", project.id);

    if (error) throw new AppError("Could not regenerate the link.");

    revalidateProject(project.id, project.public_token);
    revalidatePath(`/p/${token}`);
    return success("New client link generated. The old one no longer works.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not regenerate the link."));
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function addMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));

    const parsed = milestoneInputSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      amount: parseAmount(formData.get("amount")),
      due_date: formData.get("due_date") ?? "",
    });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createSupabaseServerClient();
    const { data: last } = await supabase
      .from("milestones")
      .select("position")
      .eq("project_id", project.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("milestones").insert({
      ...parsed.data,
      project_id: project.id,
      position: (last?.position ?? 0) + 1,
      status: "pending",
    });

    if (error) throw new AppError("Could not add the milestone.");

    revalidateProject(project.id, project.public_token);
    return success("Milestone added.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not add the milestone."));
  }
}

export async function updateMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    const parsed = milestoneInputSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      amount: parseAmount(formData.get("amount")),
      due_date: formData.get("due_date") ?? "",
    });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const statusResult = milestoneStatusSchema.safeParse(formData.get("status"));
    if (!statusResult.success) return failure("Choose a valid status.");

    if (milestone.payment_status === "paid" && parsed.data.amount !== Number(milestone.amount)) {
      return failure("This milestone is paid, so its amount is locked.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("milestones")
      .update({ ...parsed.data, status: statusResult.data })
      .eq("id", milestone.id);

    if (error) throw new AppError("Could not save the milestone.");

    if (statusResult.data === "completed" && milestone.status !== "completed") {
      const { profile } = await requireSession();
      const notify = await notifyMilestoneCompletedOrInvoice({
        project,
        milestone: { ...milestone, ...parsed.data, status: statusResult.data },
        profile,
      });
      revalidateProject(project.id, project.public_token);
      if (notify.error) return failure(notify.error);
      return success(notify.message ?? "Milestone updated.");
    }

    revalidateProject(project.id, project.public_token);
    return success("Milestone updated.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not save the milestone."));
  }
}

export async function setMilestoneStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    const status = milestoneStatusSchema.safeParse(formData.get("status"));
    if (!status.success) return failure("Choose a valid status.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("milestones")
      .update({ status: status.data })
      .eq("id", milestone.id);

    if (error) throw new AppError("Could not update the status.");

    if (status.data === "completed" && milestone.status !== "completed") {
      const { profile } = await requireSession();
      const notify = await notifyMilestoneCompletedOrInvoice({
        project,
        milestone: { ...milestone, status: status.data },
        profile,
      });
      revalidateProject(project.id, project.public_token);
      if (notify.error) return failure(notify.error);
      return success(notify.message ?? "Status updated.");
    }

    revalidateProject(project.id, project.public_token);
    return success("Status updated.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not update the status."));
  }
}

export async function deleteMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    if (milestone.payment_status === "paid") {
      return failure("Paid milestones cannot be deleted.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("milestones").delete().eq("id", milestone.id);
    if (error) throw new AppError("Could not delete the milestone.");

    // Close the gap left in the ordering.
    const { data: remaining } = await supabase
      .from("milestones")
      .select("id, position")
      .eq("project_id", project.id)
      .order("position", { ascending: true });

    await Promise.all(
      (remaining ?? []).map((row, index) =>
        row.position === index + 1
          ? Promise.resolve()
          : supabase.from("milestones").update({ position: index + 1 }).eq("id", row.id),
      ),
    );

    revalidateProject(project.id, project.public_token);
    return success("Milestone deleted.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not delete the milestone."));
  }
}

export async function moveMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    const direction = formData.get("direction");
    if (direction !== "up" && direction !== "down") {
      return failure("Unknown reorder direction.");
    }

    const supabase = await createSupabaseServerClient();
    const query = supabase
      .from("milestones")
      .select("id, position")
      .eq("project_id", project.id)
      .order("position", { ascending: direction === "down" })
      .limit(1);

    // The adjacent milestone in the direction of travel.
    const { data: neighbour } = await (direction === "up"
      ? query.lt("position", milestone.position)
      : query.gt("position", milestone.position)
    ).maybeSingle();

    if (!neighbour) return success("Already at the end.");

    await supabase
      .from("milestones")
      .update({ position: neighbour.position })
      .eq("id", milestone.id);
    await supabase
      .from("milestones")
      .update({ position: milestone.position })
      .eq("id", neighbour.id);

    revalidateProject(project.id, project.public_token);
    return success("Milestones reordered.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not reorder the milestones."));
  }
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function createPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    const result = await ensureMilestonePaymentLink(project.id, milestone.id);

    revalidateProject(project.id, project.public_token);
    return success(result.reused ? "Payment link is ready." : "Payment link created.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not create the payment link."));
  }
}

/**
 * Records that a payment arrived outside a gateway — a UPI transfer, a bank
 * transfer, cash. The freelancer has checked their account; this writes down
 * what they saw.
 */
export async function markMilestonePaidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );
    const { profile } = await requireSession();
    const supabase = await createSupabaseServerClient();

    await settleMilestoneManually(project.id, milestone.id);

    const mailed = await emailPaidInvoiceReceipt({
      db: supabase,
      project,
      milestone,
      profile,
    });

    revalidateProject(project.id, project.public_token);

    if (mailed.emailed) {
      return success(
        `${milestone.title} marked as paid. Invoice ${mailed.number} emailed to the client.`,
      );
    }
    if (mailed.error) {
      return success(
        `${milestone.title} marked as paid. Paid invoice was not emailed: ${mailed.error}`,
      );
    }
    return success(`${milestone.title} marked as paid.`);
  } catch (error) {
    return failure(toUserMessage(error, "Could not mark the milestone paid."));
  }
}

/** Reverses a manual settlement that was confirmed too early. */
export async function markMilestoneUnpaidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    await reopenMilestone(project.id, milestone.id);

    revalidateProject(project.id, project.public_token);
    return success(`${milestone.title} is unpaid again.`);
  } catch (error) {
    return failure(toUserMessage(error, "Could not reopen the milestone."));
  }
}

export async function cancelPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { project, milestone } = await requireOwnedMilestone(
      formData.get("project_id"),
      formData.get("milestone_id"),
    );

    await releaseMilestonePaymentLink(milestone.id);

    revalidateProject(project.id, project.public_token);
    return success("Payment link cancelled.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not cancel the payment link."));
  }
}

/** Creates/reuses a milestone invoice and emails it to the client. */
export async function sendInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));
    const { profile } = await requireSession();
    const supabase = await createSupabaseServerClient();

    let milestone: Milestone | null = null;
    const milestoneId = formData.get("milestone_id");
    if (typeof milestoneId === "string" && milestoneId) {
      const owned = await requireOwnedMilestone(formData.get("project_id"), milestoneId);
      milestone = owned.milestone;
    } else {
      const { data: milestones } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("position", { ascending: true });
      milestone =
        (milestones ?? []).find(
          (row) => row.payment_status !== "paid" && Number(row.amount) > 0,
        ) ?? null;
    }

    if (!milestone) return failure("Nothing is unpaid on this project.");
    if (Number(milestone.amount) <= 0) {
      return failure("That milestone has no amount to invoice.");
    }

    const result = await sendInvoiceForMilestone({ project, milestone, profile });
    revalidateProject(project.id, project.public_token);

    if (result.emailed) {
      return success(`Invoice ${result.number} emailed to the client.`);
    }
    if (result.error?.includes("client email")) {
      return failure(result.error);
    }
    return failure(
      result.error
        ? `Invoice ${result.number} is ready, but email failed: ${result.error}`
        : `Invoice ${result.number} is ready at ${result.invoiceUrl}, but email was not sent.`,
    );
  } catch (error) {
    return failure(toUserMessage(error, "Could not send the invoice."));
  }
}

/** Emails and texts the client about the current unpaid milestone. */
export async function remindClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const project = await requireOwnedProject(formData.get("project_id"));
    const { profile } = await requireSession();
    const supabase = await createSupabaseServerClient();

    const phone = normalizePhone(project.client_phone);
    const hasEmail = Boolean(project.client_email?.trim());

    if (!hasEmail && !phone) {
      return failure("Add a client email or phone in project settings first.");
    }

    const { data: milestones } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("position", { ascending: true });

    const due = (milestones ?? []).find((row) => row.payment_status !== "paid" && Number(row.amount) > 0);
    if (!due) return failure("Nothing is unpaid on this project.");

    const forced = formData.get("force") === "1";
    const skipEmail =
      !forced && hasEmail && (await recentlyReminded(supabase, project.id, due.id, "email"));
    const skipSms =
      !forced && Boolean(phone) && (await recentlyReminded(supabase, project.id, due.id, "sms"));

    if ((hasEmail ? skipEmail : true) && (phone ? skipSms : true)) {
      return failure("A reminder already went out in the last 3 days.");
    }

    const sent = await notifyClient({
      db: supabase,
      project,
      profile,
      kind: "payment_reminder",
      milestone: due,
      skipEmail,
      skipSms,
    });

    if (phone && !skipSms && !sent.sms) {
      const reason = sent.error ?? "MSG91 did not send the text.";
      if (sent.email) {
        return failure(`Email sent, but the text did not: ${reason}`);
      }
      return failure(reason);
    }

    if (!sent.email && !sent.sms) {
      return failure(
        sent.error ??
          "Could not send the reminder. Check that email/SMS keys are set, and that the client contact details are valid.",
      );
    }

    revalidateProject(project.id, project.public_token);
    const via = [sent.email ? "email" : null, sent.sms ? "SMS" : null].filter(Boolean).join(" and ");
    return success(`Reminder sent by ${via}.`);
  } catch (error) {
    return failure(toUserMessage(error, "Could not send the reminder."));
  }
}
