import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/google-mail/return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing Gmail connection — OutreachOS" },
      { name: "description", content: "Completing the secure Gmail authorisation for your outreach workspace." },
      { property: "og:title", content: "Finishing Gmail connection — OutreachOS" },
      { property: "og:description", content: "Completing the secure Gmail authorisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = React.useState("Finishing connection…");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_mail", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Authorisation did not complete.");
      notify("appUserConnectorOAuthFailed");
      return;
    }

    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Authorisation completed without an exchange code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }

    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-sm text-muted-foreground">
      <p>{message}</p>
    </main>
  );
}
