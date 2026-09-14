import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SmtpInput {
  label: string;
  address: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

function validate(input: SmtpInput): SmtpInput {
  const address = (input?.address ?? "").trim();
  const host = (input?.host ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error("Enter a valid email address");
  if (!host) throw new Error("Enter the outgoing mail server (for example mail.yourdomain.com)");
  if (!input.password) throw new Error("Enter the mailbox password");
  const port = Number(input.port) || 465;
  return {
    label: (input.label || address.split("@")[0] || "Mailbox").trim(),
    address,
    host,
    port,
    secure: input.secure ?? port === 465,
    username: (input.username || address).trim(),
    password: input.password,
  };
}

export const connectSmtpAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<{ ok: true; accountId: string }> => {
    const { supabase, userId } = context;
    const { smtpVerify } = await import("@/server/smtpClient.server");
    const { saveSmtpConfig } = await import("@/server/smtpAccounts.server");

    const cfg = {
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.username,
      pass: data.password,
    };

    try {
      await smtpVerify(cfg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reach the mail server";
      throw new Error(message);
    }

    await saveSmtpConfig(userId, data.address, cfg);

    const nowIso = new Date().toISOString();
    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("address", data.address)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("email_accounts")
        .update({ label: data.label, provider: "smtp", status: "connected", last_sync_at: nowIso })
        .eq("id", existing.id);
      return { ok: true, accountId: existing.id };
    }

    const { data: inserted, error } = await supabase
      .from("email_accounts")
      .insert({
        user_id: userId,
        label: data.label,
        address: data.address,
        provider: "smtp",
        status: "connected",
        category_ids: [],
        daily_limit: 200,
        sent_today: 0,
        last_sync_at: nowIso,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, accountId: inserted.id };
  });

export const disconnectSmtpAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { address: string }) => {
    if (!input?.address) throw new Error("Missing address");
    return { address: input.address };
  })
  .handler(async ({ data, context }) => {
    const { deleteSmtpConfig } = await import("@/server/smtpAccounts.server");
    await deleteSmtpConfig(context.userId, data.address);
    await context.supabase
      .from("email_accounts")
      .update({ status: "disconnected" })
      .eq("user_id", context.userId)
      .eq("address", data.address);
    return { ok: true };
  });

export const getSmtpAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { listSmtpAddresses } = await import("@/server/smtpAccounts.server");
    return listSmtpAddresses(context.userId);
  });
