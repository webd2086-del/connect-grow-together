import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { useFollowUpBuckets, useLookups, useOutreach } from "@/lib/outreach/store";
import { formatShort, relative } from "@/lib/outreach/format";
import { EmptyState, PageHeader, Pill, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FollowUp } from "@/lib/outreach/types";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — OutreachOS" },
      { name: "description", content: "Sequenced follow-ups that never fire at prospects who already replied." },
      { property: "og:title", content: "Follow-ups — OutreachOS" },
      { property: "og:description", content: "Due today, overdue and upcoming follow-ups in one queue." },
    ],
  }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const store = useOutreach();
  const buckets = useFollowUpBuckets();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Sequence: initial email → wait 3 days → follow-up #1 → wait 5 days → follow-up #2. Replies stop the sequence automatically."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Overdue" count={buckets.overdue.length} tone="danger" />
        <Summary label="Due today" count={buckets.today.length} tone="warn" />
        <Summary label="Upcoming" count={buckets.upcoming.length} tone="info" />
      </div>

      <Group title="Overdue" items={buckets.overdue} />
      <Group title="Due today" items={buckets.today} />
      <Group title="Upcoming" items={buckets.upcoming} />

      <SectionCard title="Sequence" description="Applied to new campaigns by default">
        <ol className="space-y-3 text-sm">
          {[
            "Initial email",
            "Wait 3 days",
            "Follow-up #1 — short nudge referencing the proposal",
            "Wait 5 days",
            "Follow-up #2 — final check-in with a clear close",
          ].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="num grid size-6 place-items-center rounded-full bg-muted text-xs text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          A follow-up is skipped automatically when the recipient has replied, bounced or been marked Do Not Contact.
        </p>
      </SectionCard>
    </div>
  );

  function Group({ title, items }: { title: string; items: FollowUp[] }) {
    return (
      <SectionCard title={title} description={`${items.length} follow-ups`} bodyClassName="p-0">
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nothing here" description="You're all caught up in this bucket." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((f) => (
              <FollowUpRow key={f.id} followUp={f} />
            ))}
          </ul>
        )}
      </SectionCard>
    );
  }

  function FollowUpRow({ followUp }: { followUp: FollowUp }) {
    const lookups = useLookups();
    const p = lookups.prospect(followUp.prospectId);
    const c = lookups.campaign(followUp.campaignId);
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(
      `Hi ${p?.contactName.split(" ")[0] ?? "there"},\n\nJust floating this back to the top of your inbox — happy to share more detail whenever useful.\n\n${store.user.name}`,
    );
    if (!p) return null;

    return (
      <li className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to="/prospects/$prospectId"
              params={{ prospectId: p.id }}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {p.company}
            </Link>
            <p className="text-xs text-muted-foreground">
              {c?.name} · step {followUp.step} · last contact {relative(p.lastContactedAt)}
            </p>
          </div>
          <Pill tone={new Date(followUp.dueAt) < new Date() ? "danger" : "info"}>
            <Clock className="size-3" /> due {formatShort(followUp.dueAt)}
          </Pill>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                store.skipFollowUp(followUp.id);
                toast.message("Follow-up skipped");
              }}
            >
              <SkipForward className="size-3.5" /> Skip
            </Button>
            <Button
              size="sm"
              onClick={() => {
                store.completeFollowUp(followUp.id);
                toast.success(`Follow-up sent to ${p.company}`);
              }}
            >
              <Check className="size-3.5" /> Send
            </Button>
          </div>
        </div>
        {editing ? (
          <div className="mt-3">
            <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
        ) : null}
      </li>
    );
  }
}

function Summary({ label, count, tone }: { label: string; count: number; tone: "danger" | "warn" | "info" }) {
  return (
    <div className="surface-card flex items-center justify-between p-5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Pill tone={tone} className="num text-sm">
        {count}
      </Pill>
    </div>
  );
}
