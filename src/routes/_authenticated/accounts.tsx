import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Link2, Mail, Plug, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useOutreach } from "@/lib/outreach/store";
import { relative } from "@/lib/outreach/format";
import { connectGmail } from "@/lib/outreach/gmail-connect";
import { getGmailStatus, disconnectGmail } from "@/lib/gmail.functions";
import { connectSmtpAccount, disconnectSmtpAccount } from "@/lib/smtp.functions";
import { CategoryChip, PageHeader, Pill, ProgressBar, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/routes/_authenticated/prospects.index";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Email Accounts — OutreachOS" },
      { name: "description", content: "Connect Gmail and Outlook accounts, set daily sending limits and monitor synchronisation." },
      { property: "og:title", content: "Email Accounts — OutreachOS" },
      { property: "og:description", content: "One sender per business, with limits, sync status and category routing." },
    ],
  }),
  component: AccountsPage,
});

const PROVIDER_LABEL = { google: "Gmail / Google Workspace", microsoft: "Microsoft / Outlook", smtp: "SMTP" } as const;

function AccountsPage() {
  const store = useOutreach();
  const [busy, setBusy] = React.useState(false);
  const [gmail, setGmail] = React.useState<{
    connected: boolean;
    reconnectRequired?: boolean;
    address?: string;
    problem?: string;
  } | null>(null);

  const refreshGmail = React.useCallback(async () => {
    try {
      const status = await getGmailStatus();
      setGmail(status);
      return status;
    } catch {
      setGmail({ connected: false });
      return null;
    }
  }, []);

  React.useEffect(() => {
    void refreshGmail();
  }, [refreshGmail]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connectGmail();
      const status = await refreshGmail();
      if (status?.connected && status.address) {
        await store.addAccount({
          label: status.address.split("@")[0] ?? "Gmail",
          address: status.address,
          provider: "google",
          status: "connected",
          categoryIds: [],
          dailyLimit: 100,
        });
        toast.success("Gmail connected", { description: status.address });
      } else {
        toast.success("Google authorisation completed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect Gmail");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectGmail();
      await refreshGmail();
      toast.message("Gmail disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect Gmail");
    } finally {
      setBusy(false);
    }
  };

  const saveSmtp = useServerFn(connectSmtpAccount);
  const removeSmtp = useServerFn(disconnectSmtpAccount);
  const [showSmtp, setShowSmtp] = React.useState(false);
  const [smtp, setSmtp] = React.useState({
    label: "",
    address: "",
    host: "",
    port: "465",
    username: "",
    password: "",
  });
  const setSmtpField = (k: keyof typeof smtp) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSmtp((s) => ({ ...s, [k]: e.target.value }));

  const handleSmtpConnect = async () => {
    setBusy(true);
    try {
      const port = Number(smtp.port) || 465;
      await saveSmtp({
        data: {
          label: smtp.label || smtp.address.split("@")[0] || "Mailbox",
          address: smtp.address.trim(),
          host: smtp.host.trim(),
          port,
          secure: port === 465,
          username: (smtp.username || smtp.address).trim(),
          password: smtp.password,
        },
      });
      await store.refresh();
      setSmtp((s) => ({ ...s, password: "" }));
      setShowSmtp(false);
      toast.success("Mailbox connected", { description: smtp.address });
    } catch (err) {
      toast.error("Could not connect that mailbox", {
        description: err instanceof Error ? err.message : "Check the server address, username and password.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSmtpDisconnect = async (address: string) => {
    setBusy(true);
    try {
      await removeSmtp({ data: { address } });
      await store.refresh();
      toast.message("Mailbox disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect that mailbox");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Accounts"
        description="Send from Gmail, or from any mailbox you own — including an info@ address from your hosting provider."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowSmtp((v) => !v)} disabled={busy}>
              <Mail className="size-4" /> Add other email
            </Button>
            <Button onClick={handleConnect} disabled={busy}>
              <Plug className="size-4" />{" "}
              {gmail?.reconnectRequired ? "Reconnect Gmail" : gmail?.connected ? "Connect another" : "Connect Gmail"}
            </Button>
          </div>
        }
      />

      {showSmtp ? (
        <SectionCard
          title="Connect another email address"
          description="For mailboxes from your hosting provider (Truehost, cPanel, Zoho and similar). Your password is stored encrypted and only used to send your campaigns."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email address">
              <Input placeholder="info@yourdomain.com" value={smtp.address} onChange={setSmtpField("address")} />
            </Field>
            <Field label="Display name for this mailbox">
              <Input placeholder="Sales inbox" value={smtp.label} onChange={setSmtpField("label")} />
            </Field>
            <Field label="Outgoing server (SMTP)">
              <Input placeholder="mail.yourdomain.com" value={smtp.host} onChange={setSmtpField("host")} />
            </Field>
            <Field label="Port">
              <Input placeholder="465" value={smtp.port} onChange={setSmtpField("port")} />
            </Field>
            <Field label="Username (usually the full address)">
              <Input placeholder="info@yourdomain.com" value={smtp.username} onChange={setSmtpField("username")} />
            </Field>
            <Field label="Password">
              <Input type="password" value={smtp.password} onChange={setSmtpField("password")} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            In Truehost cPanel open <strong>Email Accounts → Connect Devices</strong> to see your exact server name.
            Use port 465 for a secure connection, or 587 if your provider recommends it.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSmtpConnect} disabled={busy}>
              {busy ? "Checking…" : "Connect mailbox"}
            </Button>
            <Button variant="ghost" onClick={() => setShowSmtp(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-warning p-4 text-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-warning" />
          {gmail?.connected && gmail.problem ? (
            <p className="text-muted-foreground">
              <strong className="text-foreground">Google account authorised, but mail access is blocked.</strong>{" "}
              {gmail.problem}
            </p>
          ) : gmail?.connected ? (
            <p className="text-muted-foreground">
              <strong className="text-foreground">Gmail connected</strong> as {gmail.address}. Replies and sent
              messages can be read for your campaigns.
            </p>
          ) : gmail?.reconnectRequired ? (
            <p className="text-muted-foreground">
              <strong className="text-foreground">Reconnect needed.</strong> Your Google access needs to be renewed.
            </p>
          ) : (
            <p className="text-muted-foreground">
              {store.accounts.some((a) => a.status === "connected") ? (
                <>
                  <strong className="text-foreground">Sending is ready.</strong> Campaigns will go out from your
                  connected mailbox below. Connect Gmail as well if you also want replies read automatically.
                </>
              ) : (
                <>
                  <strong className="text-foreground">No mailbox connected yet.</strong> Connect Gmail, or use “Add
                  other email” for an address like info@yourdomain.com from your hosting provider.
                </>
              )}
            </p>
          )}
        </div>
        {gmail?.connected ? (
          <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={busy}>
            Disconnect Gmail
          </Button>
        ) : null}
      </div>


      <div className="grid gap-5 lg:grid-cols-2">
        {store.accounts.map((a) => {
          const remaining = Math.max(0, a.dailyLimit - a.sentToday);
          return (
            <SectionCard key={a.id} bodyClassName="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{a.label}</h2>
                  <p className="text-sm text-muted-foreground">{a.address}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{PROVIDER_LABEL[a.provider]}</p>
                </div>
                <Pill tone={a.status === "connected" ? "success" : "danger"}>
                  {a.status === "connected" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  {a.status}
                </Pill>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {a.categoryIds.map((id) => (
                  <CategoryChip key={id} category={store.categories.find((c) => c.id === id)} />
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {a.sentToday} sent today · {remaining} remaining
                  </span>
                  <span className="num">{a.dailyLimit}/day</span>
                </div>
                <ProgressBar value={(a.sentToday / a.dailyLimit) * 100} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Daily sending limit">
                  <Input
                    type="number"
                    value={a.dailyLimit}
                    onChange={(e) => store.updateAccount(a.id, { dailyLimit: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Last synchronisation">
                  <div className="flex h-9 items-center text-sm text-muted-foreground">{relative(a.lastSyncAt)}</div>
                </Field>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    store.syncAccount(a.id);
                    toast.success(`${a.label} synchronised`, { description: "Replies and bounces are up to date." });
                  }}
                >
                  <RefreshCw className="size-3.5" /> Sync now
                </Button>
                <Button
                  size="sm"
                  variant={a.status === "connected" ? "ghost" : "default"}
                  disabled={busy}
                  onClick={() => {
                    if (a.provider === "smtp" && a.status === "connected") {
                      void handleSmtpDisconnect(a.address);
                      return;
                    }
                    if (a.provider === "smtp") {
                      setSmtp((s) => ({ ...s, address: a.address, label: a.label }));
                      setShowSmtp(true);
                      return;
                    }
                    store.toggleAccount(a.id);
                    toast.message(a.status === "connected" ? "Account disconnected" : "Account connected");
                  }}
                >
                  <Link2 className="size-3.5" /> {a.status === "connected" ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard title="How synchronisation works" description="What the app reads once an account is connected">
        <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Sent messages matched to campaign recipients",
            "Replies matched back to the prospect and campaign",
            "Bounces and delivery failures",
            "Thread history for the conversation view",
            "Follow-up responses that stop a sequence",
            "Nothing else — the app never reads unrelated mail",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-success" /> {t}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
