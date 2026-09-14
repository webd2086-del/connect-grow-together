import { supabase } from "@/integrations/supabase/client";
import type {
  Activity,
  Campaign,
  CampaignRecipient,
  Category,
  EmailAccount,
  FollowUp,
  LeadStatus,
  Prospect,
  Template,
  WorkspaceState,
} from "./types";

/* -------------------------------- mappers -------------------------------- */

type Row = Record<string, unknown>;
const s = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const n = (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback);
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const nullable = (v: unknown) => (typeof v === "string" ? v : null);

export const toCategory = (r: Row): Category => ({
  id: s(r["id"]),
  name: s(r["name"]),
  icon: s(r["icon"], "✨"),
  color: s(r["color"], "chart-1"),
  purposes: arr(r["purposes"]),
  emailAccountId: nullable(r["email_account_id"]) ?? undefined,
});

export const toAccount = (r: Row): EmailAccount => ({
  id: s(r["id"]),
  label: s(r["label"]),
  address: s(r["address"]),
  provider: (s(r["provider"], "google") as EmailAccount["provider"]) ?? "google",
  status: (s(r["status"], "disconnected") as EmailAccount["status"]) ?? "disconnected",
  categoryIds: arr(r["category_ids"]),
  dailyLimit: n(r["daily_limit"], 100),
  sentToday: n(r["sent_today"]),
  lastSyncAt: nullable(r["last_sync_at"]),
});

export const toProspect = (r: Row): Prospect => ({
  id: s(r["id"]),
  company: s(r["company"]),
  contactName: s(r["contact_name"]),
  email: s(r["email"]),
  phone: nullable(r["phone"]) ?? undefined,
  website: nullable(r["website"]) ?? undefined,
  industry: nullable(r["industry"]) ?? undefined,
  country: s(r["country"]),
  city: s(r["city"]),
  categoryId: s(r["category_id"]),
  tags: arr(r["tags"]),
  notes: nullable(r["notes"]) ?? undefined,
  status: s(r["status"], "new") as LeadStatus,
  createdAt: s(r["created_at"]),
  lastContactedAt: nullable(r["last_contacted_at"]),
  lastResponseAt: nullable(r["last_response_at"]),
  nextFollowUpAt: nullable(r["next_follow_up_at"]),
});

export const toCampaign = (r: Row): Campaign => ({
  id: s(r["id"]),
  name: s(r["name"]),
  categoryId: s(r["category_id"]),
  purpose: s(r["purpose"]),
  description: nullable(r["description"]) ?? undefined,
  emailAccountId: s(r["email_account_id"]),
  subject: s(r["subject"]),
  body: s(r["body"]),
  status: s(r["status"], "draft") as Campaign["status"],
  createdAt: s(r["created_at"]),
  batchSize: n(r["batch_size"], 20),
  intervalMinutes: n(r["interval_minutes"], 5),
  scheduledAt: nullable(r["scheduled_at"]),
});

export const toRecipient = (r: Row): CampaignRecipient => ({
  id: s(r["id"]),
  campaignId: s(r["campaign_id"]),
  prospectId: s(r["prospect_id"]),
  state: s(r["state"], "queued") as CampaignRecipient["state"],
  sentAt: nullable(r["sent_at"]),
  openedAt: nullable(r["opened_at"]),
  openCount: n(r["open_count"]),
  repliedAt: nullable(r["replied_at"]),
  followUpAt: nullable(r["follow_up_at"]),
  outcome: (nullable(r["outcome"]) as CampaignRecipient["outcome"]) ?? null,
  subject: nullable(r["subject"]) ?? undefined,
  body: nullable(r["body"]) ?? undefined,
});

export const toTemplate = (r: Row): Template => ({
  id: s(r["id"]),
  name: s(r["name"]),
  categoryId: s(r["category_id"]),
  subject: s(r["subject"]),
  body: s(r["body"]),
  timesUsed: n(r["times_used"]),
  replyRate: n(r["reply_rate"]),
  won: n(r["won"]),
});

export const toFollowUp = (r: Row): FollowUp => ({
  id: s(r["id"]),
  prospectId: s(r["prospect_id"]),
  campaignId: s(r["campaign_id"]),
  step: n(r["step"], 1),
  dueAt: s(r["due_at"]),
  status: s(r["status"], "pending") as FollowUp["status"],
  note: nullable(r["note"]) ?? undefined,
});

export const toActivity = (r: Row): Activity => ({
  id: s(r["id"]),
  type: s(r["type"], "prospect_updated") as Activity["type"],
  at: s(r["at"]),
  title: s(r["title"]),
  detail: nullable(r["detail"]) ?? undefined,
  prospectId: nullable(r["prospect_id"]) ?? undefined,
  campaignId: nullable(r["campaign_id"]) ?? undefined,
  categoryId: nullable(r["category_id"]) ?? undefined,
});

/* --------------------------------- loading -------------------------------- */

const db = supabase as unknown as {
  from: (t: string) => {
    select: (q: string) => {
      order: (c: string, o?: { ascending?: boolean }) => Promise<{ data: Row[] | null; error: unknown }>;
    };
  };
};

async function list(table: string, orderCol: string, ascending = false): Promise<Row[]> {
  const { data, error } = await db.from(table).select("*").order(orderCol, { ascending });
  if (error) throw error;
  return data ?? [];
}

export interface LoadedWorkspace extends Omit<WorkspaceState, "user"> {
  user: WorkspaceState["user"];
}

export async function loadWorkspace(user: { id: string; email: string }): Promise<LoadedWorkspace> {
  const [profileRes, categories, accounts, prospects, campaigns, recipients, templates, followUps, activities] =
    await Promise.all([
      (supabase as unknown as {
        from: (t: string) => {
          select: (q: string) => { maybeSingle: () => Promise<{ data: Row | null }> };
        };
      })
        .from("profiles")
        .select("*")
        .maybeSingle(),
      list("categories", "created_at", true),
      list("email_accounts", "created_at", true),
      list("prospects", "created_at"),
      list("campaigns", "created_at"),
      list("campaign_recipients", "created_at"),
      list("templates", "created_at"),
      list("follow_ups", "due_at", true),
      list("activities", "at"),
    ]);

  return {
    user: {
      name: s(profileRes.data?.["display_name"], user.email.split("@")[0] ?? "You"),
      email: user.email,
      workspace: s(profileRes.data?.["workspace_name"], "My Workspace"),
    },
    categories: categories.map(toCategory),
    accounts: accounts.map(toAccount),
    prospects: prospects.map(toProspect),
    campaigns: campaigns.map(toCampaign),
    recipients: recipients.map(toRecipient),
    templates: templates.map(toTemplate),
    followUps: followUps.map(toFollowUp),
    activities: activities.map(toActivity),
  };
}

/* -------------------------------- writing --------------------------------- */

type Writable = { from: (t: string) => any };

export async function insertRow(table: string, values: Record<string, unknown>): Promise<Row | null> {
  const { data, error } = await (supabase as unknown as Writable)
    .from(table)
    .insert(values)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as Row) ?? null;
}

export async function insertRows(table: string, values: Record<string, unknown>[]): Promise<Row[]> {
  if (values.length === 0) return [];
  const { data, error } = await (supabase as unknown as Writable).from(table).insert(values).select();
  if (error) throw error;
  return (data as Row[]) ?? [];
}

export async function updateRow(table: string, id: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase as unknown as Writable).from(table).update(values).eq("id", id);
  if (error) throw error;
}

export async function updateRows(table: string, ids: string[], values: Record<string, unknown>): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await (supabase as unknown as Writable).from(table).update(values).in("id", ids);
  if (error) throw error;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await (supabase as unknown as Writable).from(table).delete().eq("id", id);
  if (error) throw error;
}

/** The four working categories every new workspace starts with (no demo prospects). */
export async function seedWorkspace(userId: string): Promise<void> {
  await insertRows("categories", [
    {
      user_id: userId,
      name: "Tour & Travel",
      icon: "🦁",
      color: "cat-1",
      purposes: [
        "Hotel/resort partnership",
        "Hotel rate request",
        "Tour operator partnership",
        "Safari packages",
        "Destination partnership",
      ],
    },
    {
      user_id: userId,
      name: "Schools",
      icon: "🎓",
      color: "cat-2",
      purposes: ["School trips", "Educational tours", "Student travel packages", "Software development"],
    },
    {
      user_id: userId,
      name: "Corporate / Brands",
      icon: "🏢",
      color: "cat-3",
      purposes: ["Team retreats", "Employee trips", "Corporate travel", "Brand partnerships"],
    },
    {
      user_id: userId,
      name: "Software Development",
      icon: "💻",
      color: "cat-4",
      purposes: ["Website development", "Web app development", "Maintenance retainer", "System integration"],
    },
  ]);
}

