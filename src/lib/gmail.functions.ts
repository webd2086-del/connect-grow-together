import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  appUserReconnectRequired,
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteConnectionForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "@/server/appUserConnections.server";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const GMAIL_CONNECTOR_ID = "google_mail";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

export const startGmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientAPIKey = process.env['GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientAPIKey) throw new Error("Gmail connector is not configured for this project.");

    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-mail/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existing = await getConnectionKeyForUser(context.userId, GMAIL_CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: GMAIL_CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: GMAIL_SCOPES },
    });

    return { authorizationUrl };
  });

export const completeGmailConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input || typeof input.code !== "string" || !input.code) throw new Error("Missing code");
    return { code: input.code };
  })
  .handler(async ({ data, context }) => {
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (connectorId !== GMAIL_CONNECTOR_ID) throw new Error("OAuth completion returned the wrong connector");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export interface GmailStatus {
  connected: boolean;
  reconnectRequired?: boolean;
  address?: string;
  messagesTotal?: number;
  /** Authorised, but Google refused the read — e.g. the Gmail API is off for the OAuth project. */
  problem?: string;
}

function friendlyGoogleError(status: number, raw: string): string {
  let message = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    /* keep raw text */
  }
  if (/has not been used in project|is disabled/i.test(message)) {
    return "Google has not switched on Gmail access for your Google Cloud project yet. Enable the Gmail API there, wait a minute, then refresh this page.";
  }
  if (status === 403) return `Google refused access: ${message}`;
  return `Google returned an error (${status}): ${message}`;
}

export const getGmailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GmailStatus> => {
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, GMAIL_CONNECTOR_ID);
    if (!connectionAPIKey) return { connected: false };

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: GMAIL_CONNECTOR_ID,
      path: "/gmail/v1/users/me/profile",
      requiredScopes: GMAIL_SCOPES,
    });

    if (await appUserReconnectRequired(res)) return { connected: false, reconnectRequired: true };
    if (!res.ok) {
      const raw = await res.text();
      console.error(`Gmail profile lookup failed: ${res.status} ${raw}`);
      return { connected: true, problem: friendlyGoogleError(res.status, raw) };
    }

    const profile = (await res.json()) as { emailAddress?: string; messagesTotal?: number };
    return {
      connected: true,
      address: profile.emailAddress ?? "",
      messagesTotal: profile.messagesTotal ?? 0,
    };
  });

export const disconnectGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, GMAIL_CONNECTOR_ID);
    if (connectionAPIKey) {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: GMAIL_CONNECTOR_ID,
      });
      await deleteConnectionForUser(context.userId, GMAIL_CONNECTOR_ID);
    }
    return { ok: true };
  });
