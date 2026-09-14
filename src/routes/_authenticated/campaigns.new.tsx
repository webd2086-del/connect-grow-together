import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useOutreach } from "@/lib/outreach/store";
import { applyVariables, firstName, formatDate } from "@/lib/outreach/format";
import { Field } from "@/routes/_authenticated/prospects.index";
import { CategoryChip, PageHeader, Pill, SectionCard, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CampaignRecipient } from "@/lib/outreach/types";

export const Route = createFileRoute("/_authenticated/campaigns/new")({
  head: () => ({
    meta: [
      { title: "New campaign — OutreachOS" },
      { name: "description", content: "Build a campaign: choose a purpose, compose a personalised email, review duplicates and schedule sending." },
      { property: "og:title", content: "New campaign — OutreachOS" },
      { property: "og:description", content: "Compose, personalise, de-duplicate and schedule outreach in four steps." },
    ],
  }),
  component: NewCampaign,
});

const STEPS = ["Campaign", "Compose", "Recipients", "Sending"];

function NewCampaign() {
  const store = useOutreach();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);

  const firstCategory = store.categories[0]!;
  const [form, setForm] = React.useState({
    name: "",
    categoryId: firstCategory.id,
    purpose: firstCategory.purposes[0] ?? "",
    description: "",
    emailAccountId: firstCategory.emailAccountId ?? store.accounts[0]!.id,
    subject: "Introducing our {{company_name}} programme",
    body: `Hello {{first_name}},

I'd love to discuss how we could work with {{company_name}} in {{city}}.

Would you be open to a short call this week?

Warm regards,
${store.user.name}`,
    signature: `${store.user.name} · ${store.user.workspace}`,
    batchSize: 10,
    intervalMinutes: 30,
    scheduleMode: "now" as "now" | "later",
    scheduledAt: "",
  });
  const [selected, setSelected] = React.useState<string[]>([]);
  const [overrides, setOverrides] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");

  const category = store.categories.find((c) => c.id === form.categoryId)!;

  // Suggest sender based on the campaign category, still user-changeable.
  React.useEffect(() => {
    const suggested = category.emailAccountId ?? store.accounts.find((a) => a.categoryIds.includes(category.id))?.id;
    if (suggested) setForm((f) => ({ ...f, emailAccountId: suggested, purpose: category.purposes[0] ?? f.purpose }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId]);

  const candidates = store.prospects.filter((p) => {
    const term = search.trim().toLowerCase();
    if (term && ![p.company, p.contactName, p.email].join(" ").toLowerCase().includes(term)) return false;
    return true;
  });

  /** recipient + purpose uniqueness check against already-sent emails */
  const duplicateFor = React.useCallback(
    (prospectId: string): CampaignRecipient | undefined =>
      store.recipients.find((r) => {
        if (r.prospectId !== prospectId || !r.sentAt) return false;
        const c = store.campaigns.find((x) => x.id === r.campaignId);
        return c?.purpose === form.purpose;
      }),
    [store.recipients, store.campaigns, form.purpose],
  );

  const duplicates = selected.filter((id) => duplicateFor(id) && !overrides.includes(id));
  const previewProspect = store.prospects.find((p) => p.id === selected[0]) ?? store.prospects[0]!;
  const vars = {
    first_name: firstName(previewProspect.contactName),
    contact_name: previewProspect.contactName,
    company_name: previewProspect.company,
    city: previewProspect.city,
    country: previewProspect.country,
    location: `${previewProspect.city}, ${previewProspect.country}`,
  };

  const canNext =
    (step === 0 && form.name.trim().length > 1) ||
    (step === 1 && form.subject.trim().length > 1 && form.body.trim().length > 10) ||
    (step === 2 && selected.length > 0) ||
    step === 3;

  const launch = (sendNow: boolean) => {
    const ids = selected.filter((id) => !duplicates.includes(id));
    const campaign = store.createCampaign(
      {
        name: form.name,
        categoryId: form.categoryId,
        purpose: form.purpose,
        description: form.description,
        emailAccountId: form.emailAccountId,
        subject: form.subject,
        body: `${form.body}\n\n—\n${form.signature}`,
        status: sendNow ? "sending" : form.scheduleMode === "later" ? "scheduled" : "draft",
        batchSize: form.batchSize,
        intervalMinutes: form.intervalMinutes,
        scheduledAt: form.scheduleMode === "later" ? form.scheduledAt || null : null,
      },
      ids,
    );
    if (sendNow) {
      const n = store.sendBatch(campaign.id, form.batchSize);
      toast.success(`Campaign launched — ${n} emails sent`, {
        description: `Remaining recipients go out in batches of ${form.batchSize} every ${form.intervalMinutes} minutes.`,
      });
    } else {
      toast.success("Campaign saved", { description: `${ids.length} recipients queued.` });
    }
    void navigate({ to: "/campaigns/$campaignId", params: { campaignId: campaign.id } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New campaign"
        description="One purpose per campaign keeps duplicate outreach impossible by accident."
        actions={
          <Button variant="outline" asChild>
            <Link to="/campaigns">Cancel</Link>
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                i === step
                  ? "border-primary bg-accent text-accent-foreground"
                  : i < step
                    ? "border-border text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              <span className="num grid size-5 place-items-center rounded-full bg-muted text-[11px]">
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <SectionCard title="Campaign information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="School Trips 2026"
              />
            </Field>
            <Field label="Category">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
              >
                {store.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purpose (uniqueness key)">
              <select
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
              >
                {category.purposes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sender email" className="sm:col-span-2">
              <select
                value={form.emailAccountId}
                onChange={(e) => setForm({ ...form, emailAccountId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
              >
                {store.accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.status !== "connected"}>
                    {a.label} — {a.address}
                    {a.status !== "connected" ? " (not connected)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Suggested automatically from the campaign category. You can change it.
              </p>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this campaign is for and who it targets."
              />
            </Field>
          </div>
        </SectionCard>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Email composition" description="Use variables to personalise every send">
            <div className="space-y-4">
              <Field label="Subject">
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {["{{first_name}}", "{{company_name}}", "{{city}}", "{{country}}", "{{contact_name}}"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm({ ...form, body: `${form.body}${v}` })}
                    className="num rounded-md border border-border bg-secondary px-2 py-1 text-[11px] text-secondary-foreground hover:border-ring/40"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Field label="Body">
                <Textarea rows={14} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </Field>
              <Field label="Signature">
                <Input value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => toast.success("Test email sent to " + store.user.email)}>
                  Send test email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    store.saveTemplate({
                      name: form.name || "Untitled template",
                      categoryId: form.categoryId,
                      subject: form.subject,
                      body: form.body,
                    });
                    toast.success("Saved to template library");
                  }}
                >
                  Save as template
                </Button>
                <Button variant="outline" onClick={() => toast.message("Attachments", { description: "Attach files from the campaign detail page." })}>
                  Attachments
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preview" description={`Rendered for ${previewProspect.company}`}>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">
                From {store.accounts.find((a) => a.id === form.emailAccountId)?.address}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{applyVariables(form.subject, vars)}</p>
              <div className="mt-3 whitespace-pre-wrap text-sm text-foreground">{applyVariables(form.body, vars)}</div>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{form.signature}</p>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Templates</p>
              {store.templates
                .filter((t) => t.categoryId === form.categoryId)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setForm({ ...form, subject: t.subject, body: t.body });
                      toast.success(`Loaded "${t.name}"`);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-ring/40"
                  >
                    <span>{t.name}</span>
                    <span className="num text-xs text-muted-foreground">{t.replyRate}% reply</span>
                  </button>
                ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          {duplicates.length > 0 ? (
            <div className="surface-card border-l-4 border-l-warning p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-warning" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Already contacted</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {duplicates.length} selected {duplicates.length === 1 ? "recipient was" : "recipients were"} already
                    contacted for the <strong>{form.purpose}</strong> purpose. They will be skipped unless you override.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {duplicates.slice(0, 4).map((id) => {
                      const p = store.prospects.find((x) => x.id === id)!;
                      const dup = duplicateFor(id)!;
                      const camp = store.campaigns.find((c) => c.id === dup.campaignId);
                      return (
                        <li key={id} className="rounded-lg border border-border px-3 py-2 text-sm">
                          <p className="font-medium text-foreground">{p.company}</p>
                          <p className="text-xs text-muted-foreground">
                            Contacted for the {camp?.name} campaign on {formatDate(dup.sentAt)}.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/prospects/$prospectId" params={{ prospectId: p.id }}>
                                View previous email
                              </Link>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelected(selected.filter((s) => s !== id))}>
                              Remove
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setOverrides([...overrides, id])}>
                              Send anyway
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <SectionCard
            title="Recipients"
            description={`${selected.length} selected · ${duplicates.length} duplicate warnings`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/import">CSV import</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelected(store.prospects.filter((p) => p.categoryId === form.categoryId).map((p) => p.id))
                  }
                >
                  Select all in {category.name}
                </Button>
              </div>
            }
            bodyClassName="p-0"
          >
            <div className="border-b border-border p-4">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prospects…" />
            </div>
            <ul className="max-h-[460px] divide-y divide-border overflow-y-auto">
              {candidates.map((p) => {
                const dup = duplicateFor(p.id);
                const checked = selected.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.company}`}
                      checked={checked}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.company}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.contactName} · {p.email}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                    <CategoryChip category={store.categories.find((c) => c.id === p.categoryId)} />
                    {dup ? (
                      <Pill tone={overrides.includes(p.id) ? "accent" : "warn"}>
                        {overrides.includes(p.id) ? "override" : "already contacted"}
                      </Pill>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Sending options">
            <div className="space-y-4">
              <div className="flex gap-2">
                {(["now", "later"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm({ ...form, scheduleMode: m })}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
                      form.scheduleMode === m ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    {m === "now" ? "Send immediately" : "Schedule"}
                  </button>
                ))}
              </div>
              {form.scheduleMode === "later" ? (
                <Field label="Start at">
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Batch size">
                  <Input
                    type="number"
                    min={1}
                    value={form.batchSize}
                    onChange={(e) => setForm({ ...form, batchSize: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Interval (minutes)">
                  <Input
                    type="number"
                    min={1}
                    value={form.intervalMinutes}
                    onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                Send <strong>{form.batchSize}</strong> emails every <strong>{form.intervalMinutes}</strong> minutes ·
                roughly{" "}
                {Math.ceil(
                  ((selected.length - duplicates.length) / Math.max(1, form.batchSize)) * form.intervalMinutes,
                )}{" "}
                minutes to complete.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Review">
            <dl className="space-y-3 text-sm">
              <Row label="Campaign" value={form.name || "Untitled"} />
              <Row label="Category" value={`${category.icon} ${category.name}`} />
              <Row label="Purpose" value={form.purpose} />
              <Row label="Sender" value={store.accounts.find((a) => a.id === form.emailAccountId)?.address ?? "—"} />
              <Row label="Recipients" value={`${selected.length - duplicates.length} (after duplicates)`} />
              <Row label="Duplicates skipped" value={String(duplicates.length)} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => launch(form.scheduleMode === "now")} disabled={selected.length === 0}>
                <Send className="size-4" />
                {form.scheduleMode === "now" ? "Launch campaign" : "Schedule campaign"}
              </Button>
              <Button variant="outline" onClick={() => launch(false)}>
                Save as draft
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" /> Emails are personalised per recipient before sending.
            </p>
          </SectionCard>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button disabled={!canNext || step === 3} onClick={() => setStep((s) => Math.min(3, s + 1))}>
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
