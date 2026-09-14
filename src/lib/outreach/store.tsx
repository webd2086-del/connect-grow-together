import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteRow,
  insertRow,
  insertRows,
  loadWorkspace,
  seedWorkspace,
  updateRow,
  updateRows,
} from "./api";
import { NOW } from "./format";
import type {
  Activity,
  ActivityType,
  Campaign,
  CampaignRecipient,
  Category,
  EmailAccount,
  FollowUp,
  ID,
  LeadStatus,
  Prospect,
  Template,
  WorkspaceState,
} from "./types";

interface StoreValue extends WorkspaceState {
  /** true once the workspace has been loaded from the database */
  ready: boolean;
  /** true when no authenticated user is present (e.g. the /auth route) */
  signedOut: boolean;
  refresh: () => Promise<void>;
  addProspect: (p: Omit<Prospect, "id" | "createdAt" | "status"> & Partial<Pick<Prospect, "status">>) => Prospect;
  addProspects: (list: Array<Omit<Prospect, "id" | "createdAt" | "status">>) => number;
  updateProspect: (id: ID, patch: Partial<Prospect>) => void;
  deleteProspect: (id: ID) => void;
  setProspectStatus: (id: ID, status: LeadStatus) => void;
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: ID, patch: Partial<Category>) => void;
  deleteCategory: (id: ID) => void;
  createCampaign: (c: Omit<Campaign, "id" | "createdAt">, prospectIds: ID[]) => Campaign;
  updateCampaign: (id: ID, patch: Partial<Campaign>) => void;
  deleteCampaign: (id: ID) => void;
  sendBatch: (campaignId: ID, count?: number) => number;
  addRecipients: (campaignId: ID, prospectIds: ID[]) => number;
  markReplied: (recipientId: ID) => void;
  saveTemplate: (t: Omit<Template, "id" | "timesUsed" | "replyRate" | "won">) => void;
  deleteTemplate: (id: ID) => void;
  completeFollowUp: (id: ID) => void;
  skipFollowUp: (id: ID) => void;
  scheduleFollowUp: (prospectId: ID, campaignId: ID, dueAt: string) => void;
  syncAccount: (id: ID) => void;
  toggleAccount: (id: ID) => void;
  updateAccount: (id: ID, patch: Partial<EmailAccount>) => void;
  addAccount: (a: Omit<EmailAccount, "id" | "sentToday" | "lastSyncAt">) => Promise<EmailAccount | null>;
  duplicateCheck: (prospectId: ID, campaignId: ID) => CampaignRecipient | undefined;
  reset: () => void;
}

const StoreContext = React.createContext<StoreValue | null>(null);

const EMPTY: WorkspaceState = {
  user: { name: "", email: "", workspace: "My Workspace" },
  categories: [],
  accounts: [],
  prospects: [],
  campaigns: [],
  recipients: [],
  templates: [],
  followUps: [],
  activities: [],
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Fire-and-forget DB write with a visible failure. */
function persist(p: Promise<unknown>) {
  void p.catch((err: unknown) => {
    console.error(err);
    toast.error("Could not save to the database", {
      description: err instanceof Error ? err.message : "Please retry.",
    });
  });
}

/* ------------------------------ row builders ------------------------------ */

const prospectRow = (userId: string, p: Prospect) => ({
  id: p.id,
  user_id: userId,
  category_id: p.categoryId,
  company: p.company,
  contact_name: p.contactName,
  email: p.email,
  phone: p.phone ?? null,
  website: p.website ?? null,
  industry: p.industry ?? null,
  country: p.country,
  city: p.city,
  tags: p.tags,
  notes: p.notes ?? null,
  status: p.status,
  created_at: p.createdAt,
  last_contacted_at: p.lastContactedAt ?? null,
  last_response_at: p.lastResponseAt ?? null,
  next_follow_up_at: p.nextFollowUpAt ?? null,
});

const PROSPECT_COLS: Partial<Record<keyof Prospect, string>> = {
  company: "company",
  contactName: "contact_name",
  email: "email",
  phone: "phone",
  website: "website",
  industry: "industry",
  country: "country",
  city: "city",
  categoryId: "category_id",
  tags: "tags",
  notes: "notes",
  status: "status",
  lastContactedAt: "last_contacted_at",
  lastResponseAt: "last_response_at",
  nextFollowUpAt: "next_follow_up_at",
};

const CAMPAIGN_COLS: Partial<Record<keyof Campaign, string>> = {
  name: "name",
  categoryId: "category_id",
  purpose: "purpose",
  description: "description",
  emailAccountId: "email_account_id",
  subject: "subject",
  body: "body",
  status: "status",
  batchSize: "batch_size",
  intervalMinutes: "interval_minutes",
  scheduledAt: "scheduled_at",
};

const ACCOUNT_COLS: Partial<Record<keyof EmailAccount, string>> = {
  label: "label",
  address: "address",
  provider: "provider",
  status: "status",
  categoryIds: "category_ids",
  dailyLimit: "daily_limit",
  sentToday: "sent_today",
  lastSyncAt: "last_sync_at",
};

const CATEGORY_COLS: Partial<Record<keyof Category, string>> = {
  name: "name",
  icon: "icon",
  color: "color",
  purposes: "purposes",
  emailAccountId: "email_account_id",
};

function toRow<T>(patch: Partial<T>, map: Partial<Record<keyof T, string>>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const col = map[key];
    if (col) out[col] = patch[key] ?? null;
  }
  return out;
}

/* -------------------------------- provider -------------------------------- */

export function OutreachProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<WorkspaceState>(EMPTY);
  const [ready, setReady] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [signedOut, setSignedOut] = React.useState(false);

  const load = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setSignedOut(true);
      setUserId(null);
      setState(EMPTY);
      setReady(true);
      return;
    }
    setSignedOut(false);
    setUserId(user.id);
    try {
      let ws = await loadWorkspace({ id: user.id, email: user.email ?? "" });
      if (ws.categories.length === 0) {
        await seedWorkspace(user.id);
        ws = await loadWorkspace({ id: user.id, email: user.email ?? "" });
      }
      setState(ws);
    } catch (err) {
      console.error(err);
      toast.error("Could not load your workspace", {
        description: err instanceof Error ? err.message : "Please refresh the page.",
      });
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const mutate = React.useCallback((fn: (draft: WorkspaceState) => void) => {
    setState((prev) => {
      const draft: WorkspaceState = {
        ...prev,
        categories: [...prev.categories],
        accounts: [...prev.accounts],
        prospects: [...prev.prospects],
        campaigns: [...prev.campaigns],
        recipients: [...prev.recipients],
        templates: [...prev.templates],
        followUps: [...prev.followUps],
        activities: [...prev.activities],
      };
      fn(draft);
      return draft;
    });
  }, []);

  const logActivity = React.useCallback(
    (draft: WorkspaceState, type: ActivityType, title: string, extra: Partial<Activity> = {}) => {
      const activity: Activity = { id: uid(), type, at: new Date().toISOString(), title, ...extra };
      draft.activities = [activity, ...draft.activities];
      if (userId) {
        persist(
          insertRow("activities", {
            id: activity.id,
            user_id: userId,
            type: activity.type,
            at: activity.at,
            title: activity.title,
            detail: activity.detail ?? null,
            prospect_id: activity.prospectId ?? null,
            campaign_id: activity.campaignId ?? null,
            category_id: activity.categoryId ?? null,
          }),
        );
      }
    },
    [userId],
  );

  const value = React.useMemo<StoreValue>(() => {
    const uidOr = userId ?? "";
    return {
      ...state,
      ready,
      signedOut,
      refresh: load,

      addProspect(input) {
        const prospect: Prospect = {
          id: uid(),
          createdAt: new Date().toISOString(),
          status: input.status ?? "new",
          lastContactedAt: null,
          lastResponseAt: null,
          nextFollowUpAt: null,
          ...input,
        };
        mutate((d) => {
          d.prospects = [prospect, ...d.prospects];
          logActivity(d, "prospect_created", `${prospect.company} added as a prospect`, {
            prospectId: prospect.id,
            categoryId: prospect.categoryId,
            detail: prospect.email,
          });
        });
        if (userId) persist(insertRow("prospects", prospectRow(uidOr, prospect)));
        return prospect;
      },

      addProspects(list) {
        const created = list.map<Prospect>((input) => ({
          id: uid(),
          createdAt: new Date().toISOString(),
          status: "new",
          lastContactedAt: null,
          lastResponseAt: null,
          nextFollowUpAt: null,
          ...input,
        }));
        mutate((d) => {
          d.prospects = [...created, ...d.prospects];
          logActivity(d, "prospect_created", `${created.length} prospects imported`, { detail: "CSV import" });
        });
        if (userId) persist(insertRows("prospects", created.map((p) => prospectRow(uidOr, p))));
        return created.length;
      },

      updateProspect(id, patch) {
        mutate((d) => {
          d.prospects = d.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p));
          const p = d.prospects.find((x) => x.id === id);
          if (p) logActivity(d, "prospect_updated", `${p.company} updated`, { prospectId: id });
        });
        if (userId) persist(updateRow("prospects", id, toRow(patch, PROSPECT_COLS)));
      },

      deleteProspect(id) {
        mutate((d) => {
          d.prospects = d.prospects.filter((p) => p.id !== id);
          d.recipients = d.recipients.filter((r) => r.prospectId !== id);
          d.followUps = d.followUps.filter((f) => f.prospectId !== id);
        });
        if (userId) persist(deleteRow("prospects", id));
      },

      setProspectStatus(id, status) {
        mutate((d) => {
          d.prospects = d.prospects.map((p) => (p.id === id ? { ...p, status } : p));
          const p = d.prospects.find((x) => x.id === id);
          if (p)
            logActivity(d, "status_changed", `${p.company} marked ${status.replace("_", " ")}`, {
              prospectId: id,
              categoryId: p.categoryId,
            });
        });
        if (userId) persist(updateRow("prospects", id, { status }));
      },

      addCategory(c) {
        const category: Category = { ...c, id: uid() };
        mutate((d) => {
          d.categories = [...d.categories, category];
        });
        if (userId)
          persist(
            insertRow("categories", {
              id: category.id,
              user_id: uidOr,
              name: category.name,
              icon: category.icon,
              color: category.color,
              purposes: category.purposes,
              email_account_id: category.emailAccountId ?? null,
            }),
          );
      },

      updateCategory(id, patch) {
        mutate((d) => {
          d.categories = d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
        });
        if (userId) persist(updateRow("categories", id, toRow(patch, CATEGORY_COLS)));
      },

      deleteCategory(id) {
        mutate((d) => {
          d.categories = d.categories.filter((c) => c.id !== id);
        });
        if (userId) persist(deleteRow("categories", id));
      },

      createCampaign(input, prospectIds) {
        const campaign: Campaign = { ...input, id: uid(), createdAt: new Date().toISOString() };
        const recipients = prospectIds.map<CampaignRecipient>((pid) => ({
          id: uid(),
          campaignId: campaign.id,
          prospectId: pid,
          state: "queued",
          sentAt: null,
          openedAt: null,
          openCount: 0,
          repliedAt: null,
          followUpAt: null,
          outcome: null,
          subject: campaign.subject,
          body: campaign.body,
        }));
        mutate((d) => {
          d.campaigns = [campaign, ...d.campaigns];
          d.recipients = [...recipients, ...d.recipients];
          logActivity(d, "campaign_started", `${campaign.name} campaign created`, {
            campaignId: campaign.id,
            categoryId: campaign.categoryId,
            detail: `${prospectIds.length} recipients queued`,
          });
        });
        if (userId) {
          persist(
            (async () => {
              await insertRow("campaigns", {
                id: campaign.id,
                user_id: uidOr,
                category_id: campaign.categoryId || null,
                email_account_id: campaign.emailAccountId || null,
                name: campaign.name,
                purpose: campaign.purpose,
                description: campaign.description ?? null,
                subject: campaign.subject,
                body: campaign.body,
                status: campaign.status,
                batch_size: campaign.batchSize,
                interval_minutes: campaign.intervalMinutes,
                scheduled_at: campaign.scheduledAt ?? null,
                created_at: campaign.createdAt,
              });
              await insertRows(
                "campaign_recipients",
                recipients.map((r) => ({
                  id: r.id,
                  user_id: uidOr,
                  campaign_id: r.campaignId,
                  prospect_id: r.prospectId,
                  state: r.state,
                  subject: r.subject ?? null,
                  body: r.body ?? null,
                })),
              );
            })(),
          );
        }
        return campaign;
      },

      updateCampaign(id, patch) {
        mutate((d) => {
          d.campaigns = d.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c));
          const c = d.campaigns.find((x) => x.id === id);
          if (c && patch.status) {
            const type: ActivityType =
              patch.status === "paused"
                ? "campaign_paused"
                : patch.status === "completed"
                  ? "campaign_completed"
                  : "campaign_started";
            logActivity(d, type, `${c.name} ${patch.status}`, { campaignId: c.id, categoryId: c.categoryId });
          }
        });
        if (userId) persist(updateRow("campaigns", id, toRow(patch, CAMPAIGN_COLS)));
      },

      deleteCampaign(id) {
        mutate((d) => {
          d.campaigns = d.campaigns.filter((c) => c.id !== id);
          d.recipients = d.recipients.filter((r) => r.campaignId !== id);
          d.followUps = d.followUps.filter((f) => f.campaignId !== id);
        });
        if (userId) persist(deleteRow("campaigns", id));
      },

      sendBatch(campaignId, count) {
        let sent = 0;
        mutate((d) => {
          const campaign = d.campaigns.find((c) => c.id === campaignId);
          if (!campaign) return;
          const limit = count ?? campaign.batchSize;
          const queued = d.recipients.filter((r) => r.campaignId === campaignId && r.state === "queued");
          const batch = queued.slice(0, limit);
          const now = new Date().toISOString();
          const ids = new Set(batch.map((b) => b.id));
          d.recipients = d.recipients.map((r) => (ids.has(r.id) ? { ...r, state: "sent", sentAt: now } : r));
          const touched: Prospect[] = [];
          d.prospects = d.prospects.map((p) => {
            if (!batch.some((b) => b.prospectId === p.id)) return p;
            const next: Prospect = {
              ...p,
              status: p.status === "new" ? "contacted" : p.status,
              lastContactedAt: now,
            };
            touched.push(next);
            return next;
          });
          for (const b of batch) {
            const prospect = d.prospects.find((p) => p.id === b.prospectId);
            logActivity(d, "email_sent", `${campaign.name} sent to ${prospect?.company ?? "prospect"}`, {
              prospectId: b.prospectId,
              campaignId,
              categoryId: campaign.categoryId,
              detail: campaign.subject,
            });
          }
          sent = batch.length;
          const remaining = d.recipients.filter((r) => r.campaignId === campaignId && r.state === "queued");
          const nextStatus: Campaign["status"] = remaining.length === 0 ? "completed" : "sending";
          d.campaigns = d.campaigns.map((c) => (c.id === campaignId ? { ...c, status: nextStatus } : c));

          if (userId && batch.length) {
            persist(
              (async () => {
                await updateRows("campaign_recipients", [...ids], { state: "sent", sent_at: now });
                for (const p of touched) {
                  await updateRow("prospects", p.id, { status: p.status, last_contacted_at: now });
                }
                await updateRow("campaigns", campaignId, { status: nextStatus });
              })(),
            );
          }
        });
        return sent;
      },

      addRecipients(campaignId, prospectIds) {
        const campaign = state.campaigns.find((c) => c.id === campaignId);
        if (!campaign) return 0;
        const existing = new Set(
          state.recipients.filter((r) => r.campaignId === campaignId).map((r) => r.prospectId),
        );
        const fresh = prospectIds.filter((pid) => !existing.has(pid));
        if (fresh.length === 0) return 0;
        const rows = fresh.map<CampaignRecipient>((pid) => ({
          id: uid(),
          campaignId,
          prospectId: pid,
          state: "queued",
          sentAt: null,
          openedAt: null,
          openCount: 0,
          repliedAt: null,
          followUpAt: null,
          outcome: null,
          subject: campaign.subject,
          body: campaign.body,
        }));
        mutate((d) => {
          d.recipients = [...rows, ...d.recipients];
        });
        if (userId)
          persist(
            insertRows(
              "campaign_recipients",
              rows.map((r) => ({
                id: r.id,
                user_id: uidOr,
                campaign_id: campaignId,
                prospect_id: r.prospectId,
                state: "queued",
                subject: r.subject ?? null,
                body: r.body ?? null,
              })),
            ),
          );
        return rows.length;
      },

      markReplied(recipientId) {
        const now = new Date().toISOString();
        let prospectId: ID | null = null;
        mutate((d) => {
          const r = d.recipients.find((x) => x.id === recipientId);
          if (!r || r.repliedAt) return;
          prospectId = r.prospectId;
          d.recipients = d.recipients.map((x) =>
            x.id === recipientId ? { ...x, state: "replied", repliedAt: now } : x,
          );
          d.prospects = d.prospects.map((p) =>
            p.id === r.prospectId
              ? {
                  ...p,
                  lastResponseAt: now,
                  status: ["new", "contacted", "opened"].includes(p.status) ? "replied" : p.status,
                }
              : p,
          );
          const p = d.prospects.find((x) => x.id === r.prospectId);
          const c = d.campaigns.find((x) => x.id === r.campaignId);
          logActivity(d, "email_replied", `${p?.company ?? "Prospect"} replied`, {
            prospectId: r.prospectId,
            campaignId: r.campaignId,
            categoryId: c?.categoryId,
          });
        });
        if (userId && prospectId) {
          const pid: string = prospectId;
          const status = state.prospects.find((p) => p.id === pid)?.status;
          persist(
            (async () => {
              await updateRow("campaign_recipients", recipientId, { state: "replied", replied_at: now });
              await updateRow("prospects", pid, {
                last_response_at: now,
                ...(status && ["new", "contacted", "opened"].includes(status) ? { status: "replied" } : {}),
              });
            })(),
          );
        }
      },

      saveTemplate(t) {
        const template: Template = { ...t, id: uid(), timesUsed: 0, replyRate: 0, won: 0 };
        mutate((d) => {
          d.templates = [template, ...d.templates];
        });
        if (userId)
          persist(
            insertRow("templates", {
              id: template.id,
              user_id: uidOr,
              category_id: template.categoryId || null,
              name: template.name,
              subject: template.subject,
              body: template.body,
            }),
          );
      },

      deleteTemplate(id) {
        mutate((d) => {
          d.templates = d.templates.filter((t) => t.id !== id);
        });
        if (userId) persist(deleteRow("templates", id));
      },

      completeFollowUp(id) {
        const now = new Date().toISOString();
        mutate((d) => {
          d.followUps = d.followUps.map((f) => (f.id === id ? { ...f, status: "sent" } : f));
          const f = d.followUps.find((x) => x.id === id);
          const p = f && d.prospects.find((x) => x.id === f.prospectId);
          if (f && p) {
            d.prospects = d.prospects.map((x) => (x.id === p.id ? { ...x, lastContactedAt: now } : x));
            logActivity(d, "follow_up_sent", `Follow-up sent to ${p.company}`, {
              prospectId: p.id,
              campaignId: f.campaignId,
            });
            if (userId) persist(updateRow("prospects", p.id, { last_contacted_at: now }));
          }
        });
        if (userId) persist(updateRow("follow_ups", id, { status: "sent" }));
      },

      skipFollowUp(id) {
        mutate((d) => {
          d.followUps = d.followUps.map((f) => (f.id === id ? { ...f, status: "skipped" } : f));
        });
        if (userId) persist(updateRow("follow_ups", id, { status: "skipped" }));
      },

      scheduleFollowUp(prospectId, campaignId, dueAt) {
        const followUp: FollowUp = { id: uid(), prospectId, campaignId, step: 1, dueAt, status: "pending" };
        mutate((d) => {
          d.followUps = [followUp, ...d.followUps];
          d.prospects = d.prospects.map((p) => (p.id === prospectId ? { ...p, nextFollowUpAt: dueAt } : p));
          const p = d.prospects.find((x) => x.id === prospectId);
          logActivity(d, "follow_up_scheduled", `Follow-up scheduled for ${p?.company ?? "prospect"}`, {
            prospectId,
            campaignId,
          });
        });
        if (userId) {
          persist(
            insertRow("follow_ups", {
              id: followUp.id,
              user_id: uidOr,
              prospect_id: prospectId,
              campaign_id: campaignId || null,
              step: 1,
              due_at: dueAt,
              status: "pending",
            }),
          );
          persist(updateRow("prospects", prospectId, { next_follow_up_at: dueAt }));
        }
      },

      syncAccount(id) {
        const now = new Date().toISOString();
        mutate((d) => {
          d.accounts = d.accounts.map((a) => (a.id === id ? { ...a, lastSyncAt: now } : a));
          const a = d.accounts.find((x) => x.id === id);
          if (a) logActivity(d, "account_synced", `${a.label} synchronised`, { detail: a.address });
        });
        if (userId) persist(updateRow("email_accounts", id, { last_sync_at: now }));
      },

      toggleAccount(id) {
        const current = state.accounts.find((a) => a.id === id);
        const nextStatus = current?.status === "connected" ? "disconnected" : "connected";
        mutate((d) => {
          d.accounts = d.accounts.map((a) =>
            a.id === id
              ? { ...a, status: nextStatus, lastSyncAt: nextStatus === "connected" ? new Date().toISOString() : a.lastSyncAt }
              : a,
          );
        });
        if (userId) persist(updateRow("email_accounts", id, { status: nextStatus }));
      },

      updateAccount(id, patch) {
        mutate((d) => {
          d.accounts = d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
        });
        if (userId) persist(updateRow("email_accounts", id, toRow(patch, ACCOUNT_COLS)));
      },

      async addAccount(input) {
        if (!userId) return null;
        const account: EmailAccount = { ...input, id: uid(), sentToday: 0, lastSyncAt: new Date().toISOString() };
        await insertRow("email_accounts", {
          id: account.id,
          user_id: uidOr,
          label: account.label,
          address: account.address,
          provider: account.provider,
          status: account.status,
          category_ids: account.categoryIds,
          daily_limit: account.dailyLimit,
          sent_today: 0,
          last_sync_at: account.lastSyncAt,
        });
        mutate((d) => {
          d.accounts = [...d.accounts.filter((a) => a.address !== account.address), account];
        });
        return account;
      },

      duplicateCheck(prospectId, campaignId) {
        const campaign = state.campaigns.find((c) => c.id === campaignId);
        if (!campaign) return undefined;
        // Uniqueness rule: recipient + campaign purpose (not simply email address).
        return state.recipients.find((r) => {
          if (r.prospectId !== prospectId) return false;
          if (!r.sentAt) return false;
          const other = state.campaigns.find((c) => c.id === r.campaignId);
          return other?.purpose === campaign.purpose;
        });
      },

      reset() {
        if (!userId) return;
        persist(
          (async () => {
            const tables = [
              "activities",
              "follow_ups",
              "campaign_recipients",
              "campaigns",
              "templates",
              "prospects",
              "categories",
            ];
            for (const table of tables) {
              const { error } = await (supabase as unknown as {
                from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> } };
              })
                .from(table)
                .delete()
                .eq("user_id", userId);
              if (error) throw error;
            }
            await seedWorkspace(userId);
            await load();
          })(),
        );
      },
    };
  }, [state, ready, signedOut, userId, mutate, logActivity, load]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOutreach(): StoreValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useOutreach must be used inside <OutreachProvider>");
  return ctx;
}

/* ---------------------------------- selectors --------------------------------- */

export function useLookups() {
  const { categories, accounts, campaigns, prospects } = useOutreach();
  return React.useMemo(
    () => ({
      category: (id?: ID) => categories.find((c) => c.id === id),
      account: (id?: ID) => accounts.find((a) => a.id === id),
      campaign: (id?: ID) => campaigns.find((c) => c.id === id),
      prospect: (id?: ID) => prospects.find((p) => p.id === id),
    }),
    [categories, accounts, campaigns, prospects],
  );
}

export interface CampaignStats {
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  interested: number;
  won: number;
  progress: number;
}

export function campaignStats(
  campaignId: ID,
  recipients: CampaignRecipient[],
  prospects: Prospect[],
): CampaignStats {
  const rows = recipients.filter((r) => r.campaignId === campaignId);
  const sent = rows.filter((r) => r.sentAt).length;
  const bounced = rows.filter((r) => r.state === "bounced").length;
  const opened = rows.filter((r) => r.openedAt).length;
  const replied = rows.filter((r) => r.repliedAt).length;
  const statusOf = (pid: ID) => prospects.find((p) => p.id === pid)?.status;
  return {
    recipients: rows.length,
    sent,
    delivered: sent - bounced,
    opened,
    replied,
    bounced,
    interested: rows.filter((r) =>
      ["interested", "meeting", "negotiating", "won"].includes(statusOf(r.prospectId) ?? ""),
    ).length,
    won: rows.filter((r) => statusOf(r.prospectId) === "won").length,
    progress: rows.length ? Math.round((sent / rows.length) * 100) : 0,
  };
}

export function useFollowUpBuckets() {
  const { followUps } = useOutreach();
  return React.useMemo(() => {
    const startOfToday = new Date(NOW);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 86400000);
    const pending = followUps.filter((f) => f.status === "pending");
    const overdue: FollowUp[] = [];
    const today: FollowUp[] = [];
    const upcoming: FollowUp[] = [];
    for (const f of pending) {
      const due = new Date(f.dueAt);
      if (due < startOfToday) overdue.push(f);
      else if (due < endOfToday) today.push(f);
      else upcoming.push(f);
    }
    const bySoonest = (a: FollowUp, b: FollowUp) => (a.dueAt < b.dueAt ? -1 : 1);
    return {
      overdue: overdue.sort(bySoonest),
      today: today.sort(bySoonest),
      upcoming: upcoming.sort(bySoonest),
      pending,
    };
  }, [followUps]);
}
