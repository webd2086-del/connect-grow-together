import { startGmailConnect } from "@/lib/gmail.functions";
import { completeGmailConnection } from "@/lib/gmail.functions";

const CONNECTOR_ID = "google_mail";

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; connectorId?: string; code?: unknown } | null;
      const type = data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        data?.connectorId !== CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof data?.code === "string" ? data.code : null);
        return;
      }
      popup.close();
      reject(new Error("Gmail authorisation failed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Google window was closed before finishing."));
    }, 500);
  });
}

/** Opens the Google consent popup and stores the resulting connection server-side. */
export async function connectGmail(): Promise<void> {
  const popup = window.open("", "lovable-oauth", "width=600,height=720");
  if (!popup) throw new Error("Popup blocked. Allow popups and try again.");
  let code: string | null;
  try {
    const { authorizationUrl } = await startGmailConnect();
    const completion = waitForOAuthCompletion(popup);
    popup.location.href = authorizationUrl;
    code = await completion;
  } catch (error) {
    popup.close();
    throw error;
  }
  if (code) await completeGmailConnection({ data: { code } });
}
