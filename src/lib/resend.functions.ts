import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface ResendDnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  priority?: number | undefined;
  status?: string | undefined;
}

export interface ResendDomain {
  id: string;
  name: string;
  status: string;
  records?: ResendDnsRecord[] | undefined;
}

/**
 * Calls the Resend API.
 * - Self-hosted / local: set RESEND_API_KEY (a normal "re_..." key from resend.com) and leave
 *   LOVABLE_API_KEY unset (or set RESEND_MODE=direct) — requests go straight to api.resend.com.
 * - On Lovable: LOVABLE_API_KEY is present and requests go through the connector gateway.
 */
export async function resendFetch(path: string, init?: RequestInit): Promise<Response> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!resendKey) throw new Error("RESEND_API_KEY is not set");
  const direct = process.env["RESEND_MODE"] === "direct" || !lovableKey;
  const headers = new Headers(init?.headers);
  if (direct) {
    headers.set("Authorization", `Bearer ${resendKey}`);
  } else {
    headers.set("Authorization", `Bearer ${lovableKey}`);
    headers.set("X-Connection-Api-Key", resendKey);
  }
  if (init?.body) headers.set("Content-Type", "application/json");
  const base = direct ? "https://api.resend.com" : GATEWAY_URL;
  return fetch(`${base}${path}`, { ...init, headers });
}

/** Domains registered in the workspace Resend account, with their DNS setup records. */
export const listResendDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ResendDomain[]> => {
    const res = await resendFetch("/domains");
    if (!res.ok) throw new Error(`Could not read Resend domains [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    const list = (await res.json()) as { data?: Array<{ id: string; name: string; status: string }> };
    const domains = list.data ?? [];
    const detailed: ResendDomain[] = [];
    for (const d of domains) {
      const one = await resendFetch(`/domains/${d.id}`);
      if (one.ok) detailed.push((await one.json()) as ResendDomain);
      else detailed.push(d);
    }
    return detailed;
  });

/** Adds a sending domain to Resend and returns the DNS records to publish. */
export const addResendDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = (input?.name ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) throw new Error("Enter a domain like yourdomain.com");
    return { name };
  })
  .handler(async ({ data }): Promise<ResendDomain> => {
    const res = await resendFetch("/domains", { method: "POST", body: JSON.stringify({ name: data.name }) });
    if (!res.ok) throw new Error(`Could not add that domain [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as ResendDomain;
  });

/** Asks Resend to re-check the DNS records for a domain. */
export const verifyResendDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing domain");
    return { id: input.id };
  })
  .handler(async ({ data }) => {
    const res = await resendFetch(`/domains/${data.id}/verify`, { method: "POST" });
    if (!res.ok) throw new Error(`Verification failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    return { ok: true };
  });

/** Makes an address send through Resend (creates the account row, or switches an existing one over). */
export const connectResendAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { address: string; label?: string }) => {
    const address = (input?.address ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error("Enter a valid email address");
    return { address, label: (input.label ?? "").trim() };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; accountId: string }> => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const label = data.label || data.address.split("@")[0] || "Resend";

    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("address", data.address)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("email_accounts")
        .update({ label, provider: "resend", status: "connected", last_sync_at: nowIso })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true, accountId: existing.id };
    }

    const { data: inserted, error } = await supabase
      .from("email_accounts")
      .insert({
        user_id: userId,
        label,
        address: data.address,
        provider: "resend",
        status: "connected",
        category_ids: [],
        daily_limit: 500,
        sent_today: 0,
        last_sync_at: nowIso,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, accountId: inserted.id };
  });
