export type ProjectStatus = "draft" | "active" | "completed" | "archived";
export type MilestoneStatus = "pending" | "in_progress" | "completed";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";
export type PaymentRecordStatus =
  | "created"
  | "pending"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired";

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  business_name: string | null;
  /** UPI Virtual Payment Address, e.g. `priya@okhdfcbank`. INR only. */
  upi_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  client_email: string | null;
  description: string | null;
  status: ProjectStatus;
  currency: string;
  public_token: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  amount: number;
  position: number;
  status: MilestoneStatus;
  due_date: string | null;
  payment_status: PaymentStatus;
  payment_link_id: string | null;
  payment_link_url: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type Payment = {
  id: string;
  project_id: string;
  milestone_id: string | null;
  amount: number;
  currency: string;
  gateway: string;
  gateway_payment_id: string | null;
  gateway_payment_link_id: string | null;
  status: PaymentRecordStatus;
  created_at: string;
  paid_at: string | null;
};

export type WebhookEvent = {
  id: string;
  gateway: string;
  event: string;
  processed_at: string;
};

type Writable<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

/**
 * Hand-written schema types. Kept in step with supabase/migrations by hand —
 * the schema is small enough that codegen would be more machinery than help.
 *
 * `Relationships` is empty on purpose: every query in this app joins in
 * TypeScript rather than through PostgREST's embedding syntax.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Writable<
          Profile,
          "id" | "created_at" | "updated_at" | "business_name" | "upi_id"
        >;
        Update: Partial<Profile>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Writable<
          Project,
          | "id"
          | "created_at"
          | "updated_at"
          | "public_token"
          | "status"
          | "currency"
          | "client_email"
          | "description"
          | "start_date"
          | "due_date"
        >;
        Update: Partial<Project>;
        Relationships: [];
      };
      milestones: {
        Row: Milestone;
        Insert: Writable<
          Milestone,
          | "id"
          | "created_at"
          | "updated_at"
          | "description"
          | "status"
          | "due_date"
          | "payment_status"
          | "payment_link_id"
          | "payment_link_url"
          | "paid_at"
          | "amount"
          | "position"
        >;
        Update: Partial<Milestone>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Writable<
          Payment,
          | "id"
          | "created_at"
          | "paid_at"
          | "currency"
          | "gateway"
          | "gateway_payment_id"
          | "gateway_payment_link_id"
          | "status"
          | "milestone_id"
        >;
        Update: Partial<Payment>;
        Relationships: [];
      };
      webhook_events: {
        Row: WebhookEvent;
        Insert: Writable<WebhookEvent, "gateway" | "processed_at">;
        Update: Partial<WebhookEvent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_project_by_token: {
        Args: { p_token: string };
        Returns: unknown;
      };
      report_payment_by_token: {
        Args: { p_token: string; p_position: number; p_reference: string | null };
        Returns: unknown;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      milestone_status: MilestoneStatus;
      payment_status: PaymentStatus;
      payment_record_status: PaymentRecordStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
