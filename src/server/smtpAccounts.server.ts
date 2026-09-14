// Server-only storage for per-user SMTP mailbox credentials (encrypted at rest).
import { decryptConnectionKey, encryptConnectionKey } from "./connectionKeyCrypto";
import type { SmtpConfig } from "./smtpClient.server";

export const smtpConnectorId = (address: string) => `smtp:${address.trim().toLowerCase()}`;

export async function saveSmtpConfig(userId: string, address: string, cfg: SmtpConfig): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("app_user_connections").upsert(
    {
      user_id: userId,
      connector_id: smtpConnectorId(address),
      connection_key_ciphertext: encryptConnectionKey(JSON.stringify(cfg)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw error;
}

export async function getSmtpConfig(userId: string, address: string): Promise<SmtpConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", smtpConnectorId(address))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return JSON.parse(decryptConnectionKey(data.connection_key_ciphertext)) as SmtpConfig;
}

export async function deleteSmtpConfig(userId: string, address: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", smtpConnectorId(address));
  if (error) throw error;
}

export async function listSmtpAddresses(userId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select("connector_id")
    .eq("user_id", userId)
    .like("connector_id", "smtp:%");
  if (error) throw error;
  return (data ?? []).map((r) => r.connector_id.slice(5));
}
