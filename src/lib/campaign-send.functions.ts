import { createServerFn } from "@tanstack/react-start";
import { appUserReconnectRequired, callAsAppUser } from "@/integrations/lovable/appUserConnector";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getConnectionKeyForUser } from "@/server/appUserConnections.server";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const GMAIL_CONNECTOR_ID = "google_mail";
const SEND_SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

function rawEmail(opts: { to: string; from: string; subject: string; body: string }) {
  const message = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${header(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    opts.body,
  ].join("\r\n");
  return b64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, key: string) => vars[key.toLowerCase()] ?? m);
}

export interface SendBatchResult {
  sent: number;
  failed: number;
  remaining: number;
  errors: string[];
  needsConnection?: boolean;
  reconnectRequired?: boolean;
}

type SendOutcome = { ok: true; messageId?: string | null; threadId?: string | null } | { ok: false; error: string };

export const sendCampaignBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string; limit?: number }) => {
    if (!input?.campaignId) throw new Error("Missing campaignId");
    return { campaignId: input.campaignId, limit: input.limit };
  })
  .handler(async ({ data, context }): Promise<SendBatchResult> => {
    const { supabase, userId } = context;
    const empty: SendBatchResult = { sent: 0, failed: 0, remaining: 0, errors: [] };

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!campaign) throw new Error("Campaign not found");

    // ---- Work out which mailbox this campaign sends from -------------------
    let account: { id: string; address: string; provider: string } | null = null;
    if (campaign.email_account_id) {
      const { data: acct } = await supabase
        .from("email_accounts")
        .select("id, address, provider")
        .eq("id", campaign.email_account_id)
        .maybeSingle();
      account = acct ?? null;
    }
    if (!account) {
      const { data: accts } = await supabase
        .from("email_accounts")
        .select("id, address, provider")
        .eq("user_id", userId)
        .eq("status", "connected")
        .order("created_at", { ascending: true });
      account = accts?.[0] ?? null;
    }

    const { getSmtpConfig } = await import("@/server/smtpAccounts.server");
    const smtpConfig = account?.provider === "smtp" ? await getSmtpConfig(userId, account.address) : null;
    const connectionAPIKey = smtpConfig ? null : await getConnectionKeyForUser(userId, GMAIL_CONNECTOR_ID);
    if (!smtpConfig && !connectionAPIKey) return { ...empty, needsConnection: true };

    const limit = Math.max(1, Math.min(data.limit ?? campaign.batch_size ?? 20, 50));

    const { data: queued, error: rErr } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("state", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (rErr) throw rErr;
    if (!queued || queued.length === 0) return { ...empty };

    const { data: prospects } = await supabase
      .from("prospects")
      .select("*")
      .in("id", queued.map((r) => r.prospect_id));

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const senderName = profile?.display_name ?? "";

    let fromAddress = account?.address ?? "";
    if (!fromAddress && connectionAPIKey) {
      const profRes = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: GMAIL_CONNECTOR_ID,
        path: "/gmail/v1/users/me/profile",
      });
      if (await appUserReconnectRequired(profRes)) return { ...empty, reconnectRequired: true };
      if (profRes.ok) {
        const p = (await profRes.json()) as { emailAddress?: string };
        fromAddress = p.emailAddress ?? "";
      }
    }
    const from = senderName && fromAddress ? `${header(senderName)} <${fromAddress}>` : fromAddress;

    // ---- Transport ---------------------------------------------------------
    let reconnect = false;
    let smtpSession: { send: (m: { from: string; fromName?: string | undefined; to: string; subject: string; text: string }) => Promise<void>; quit: () => Promise<void> } | null = null;

    if (smtpConfig) {
      const { openSmtpSession } = await import("@/server/smtpClient.server");
      try {
        smtpSession = await openSmtpSession(smtpConfig);
      } catch (err) {
        return {
          ...empty,
          failed: 0,
          errors: [err instanceof Error ? err.message : "Could not reach the mail server"],
        };
      }
    }

    const sendOne = async (to: string, subject: string, body: string): Promise<SendOutcome> => {
      if (smtpSession) {
        try {
          await smtpSession.send({ from: fromAddress, fromName: senderName || undefined, to, subject, text: body });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
        }
      }
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: connectionAPIKey!,
        connectorId: GMAIL_CONNECTOR_ID,
        path: "/gmail/v1/users/me/messages/send",
        requiredScopes: SEND_SCOPES,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw: rawEmail({ to, from, subject, body }) }),
        },
      });
      if (await appUserReconnectRequired(res)) {
        reconnect = true;
        return { ok: false, error: "Reconnect required" };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error(`Gmail send failed [${res.status}]: ${text}`);
        return { ok: false, error: `${res.status} ${text.slice(0, 200)}` };
      }
      const msg = (await res.json()) as { id?: string; threadId?: string };
      return { ok: true, messageId: msg.id ?? null, threadId: msg.threadId ?? null };
    };

    let sent = 0;
    const errors: string[] = [];
    const nowIso = new Date().toISOString();

    for (const recipient of queued) {
      const prospect = prospects?.find((p) => p.id === recipient.prospect_id);
      if (!prospect?.email) {
        errors.push("A recipient has no email address");
        await supabase
          .from("campaign_recipients")
          .update({ state: "bounced", error_message: "Missing email address" })
          .eq("id", recipient.id);
        continue;
      }

      const first = (prospect.contact_name || "").trim().split(/\s+/)[0] ?? "";
      const vars: Record<string, string> = {
        first_name: first || prospect.company,
        contact_name: prospect.contact_name || prospect.company,
        company: prospect.company,
        city: prospect.city ?? "",
        country: prospect.country ?? "",
        sender_name: senderName,
      };
      const subject = fill(recipient.subject || campaign.subject, vars);
      const body = fill(recipient.body || campaign.body, vars);

      const outcome = await sendOne(prospect.email, subject, body);

      if (!outcome.ok && reconnect) {
        return { sent, failed: errors.length, remaining: 0, errors, reconnectRequired: true };
      }

      if (!outcome.ok) {
        errors.push(`${prospect.email}: ${outcome.error}`);
        await supabase
          .from("campaign_recipients")
          .update({ state: "bounced", error_message: outcome.error.slice(0, 500) })
          .eq("id", recipient.id);
        continue;
      }

      await supabase
        .from("campaign_recipients")
        .update({
          state: "sent",
          sent_at: nowIso,
          subject,
          body,
          provider_message_id: outcome.messageId ?? null,
          provider_thread_id: outcome.threadId ?? null,
          error_message: null,
        })
        .eq("id", recipient.id);

      await supabase
        .from("prospects")
        .update({
          last_contacted_at: nowIso,
          status: prospect.status === "new" ? "contacted" : prospect.status,
        })
        .eq("id", prospect.id);

      await supabase.from("activities").insert({
        user_id: userId,
        type: "email_sent",
        title: `${campaign.name} sent to ${prospect.company}`,
        detail: subject,
        prospect_id: prospect.id,
        campaign_id: campaign.id,
        category_id: campaign.category_id,
        at: nowIso,
      });

      sent += 1;
    }

    if (smtpSession) await smtpSession.quit();

    const { count } = await supabase
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("state", "queued");
    const remaining = count ?? 0;

    await supabase
      .from("campaigns")
      .update({ status: remaining === 0 ? "completed" : "sending" })
      .eq("id", campaign.id);

    if (account) {
      await supabase
        .from("email_accounts")
        .update({ sent_today: sent, last_sync_at: nowIso })
        .eq("id", account.id);
    }

    return { sent, failed: errors.length, remaining, errors };
  });

export interface ReplySyncResult {
  checked: number;
  replies: number;
  unsupported?: boolean;
  reconnectRequired?: boolean;
}

/** Looks at each sent Gmail thread and marks recipients who wrote back. */
export const syncCampaignReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string }) => {
    if (!input?.campaignId) throw new Error("Missing campaignId");
    return { campaignId: input.campaignId };
  })
  .handler(async ({ data, context }): Promise<ReplySyncResult> => {
    const { supabase, userId } = context;
    const connectionAPIKey = await getConnectionKeyForUser(userId, GMAIL_CONNECTOR_ID);
    if (!connectionAPIKey) return { checked: 0, replies: 0, unsupported: true };

    const { data: rows } = await supabase
      .from("campaign_recipients")
      .select("id, prospect_id, provider_thread_id, replied_at")
      .eq("campaign_id", data.campaignId)
      .not("provider_thread_id", "is", null)
      .is("replied_at", null);
    if (!rows || rows.length === 0) return { checked: 0, replies: 0 };

    const profRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: GMAIL_CONNECTOR_ID,
      path: "/gmail/v1/users/me/profile",
    });
    if (await appUserReconnectRequired(profRes)) return { checked: 0, replies: 0, reconnectRequired: true };
    const me = profRes.ok ? (((await profRes.json()) as { emailAddress?: string }).emailAddress ?? "") : "";

    let replies = 0;
    for (const row of rows) {
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: GMAIL_CONNECTOR_ID,
        path: `/gmail/v1/users/me/threads/${row.provider_thread_id}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
      });
      if (await appUserReconnectRequired(res)) return { checked: rows.length, replies, reconnectRequired: true };
      if (!res.ok) continue;
      const thread = (await res.json()) as {
        messages?: Array<{ internalDate?: string; payload?: { headers?: Array<{ name: string; value: string }> } }>;
      };
      const inbound = (thread.messages ?? []).find((m) => {
        const from = m.payload?.headers?.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
        return me ? !from.toLowerCase().includes(me.toLowerCase()) : false;
      });
      if (!inbound) continue;
      const at = inbound.internalDate
        ? new Date(Number(inbound.internalDate)).toISOString()
        : new Date().toISOString();
      await supabase
        .from("campaign_recipients")
        .update({ state: "replied", replied_at: at })
        .eq("id", row.id);
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id, company, status, category_id")
        .eq("id", row.prospect_id)
        .maybeSingle();
      if (prospect) {
        await supabase
          .from("prospects")
          .update({
            last_response_at: at,
            status: ["new", "contacted", "opened"].includes(prospect.status) ? "replied" : prospect.status,
          })
          .eq("id", prospect.id);
        await supabase.from("activities").insert({
          user_id: userId,
          type: "email_replied",
          title: `${prospect.company} replied`,
          prospect_id: prospect.id,
          campaign_id: data.campaignId,
          category_id: prospect.category_id,
          at,
        });
      }
      replies += 1;
    }
    return { checked: rows.length, replies };
  });
