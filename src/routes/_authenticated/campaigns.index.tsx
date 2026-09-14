import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { campaignStats, useLookups, useOutreach } from "@/lib/outreach/store";
import { formatDate, pct } from "@/lib/outreach/format";
import { CategoryChip, PageHeader, Pill, ProgressBar, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import type { CampaignStatus } from "@/lib/outreach/types";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaigns — OutreachOS" },
      { name: "description", content: "Every outreach campaign with live sending progress, replies and conversions." },
      { property: "og:title", content: "Campaigns — OutreachOS" },
      { property: "og:description", content: "Create, pause and track email campaigns per service and category." },
    ],
  }),
  component: CampaignsPage,
});

const TONE: Record<CampaignStatus, "neutral" | "info" | "accent" | "success" | "warn" | "danger"> = {
  draft: "neutral",
  scheduled: "info",
  sending: "accent",
  paused: "warn",
  completed: "success",
  cancelled: "danger",
};

function CampaignsPage() {
  const store = useOutreach();
  const lookups = useLookups();
  const [filter, setFilter] = React.useState<CampaignStatus | "all">("all");

  const list = store.campaigns.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Each campaign targets one purpose, so the same prospect can be contacted for different services safely."
        actions={
          <Button asChild>
            <Link to="/campaigns/new">
              <Plus className="size-4" /> New campaign
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "sending", "paused", "scheduled", "draft", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === s ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((c) => {
          const stats = campaignStats(c.id, store.recipients, store.prospects);
          const account = lookups.account(c.emailAccountId);
          return (
            <SectionCard key={c.id} bodyClassName="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    to="/campaigns/$campaignId"
                    params={{ campaignId: c.id }}
                    className="text-base font-semibold text-foreground hover:text-primary"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.purpose} · {account?.address} · created {formatDate(c.createdAt)}
                  </p>
                </div>
                <Pill tone={TONE[c.status]}>{c.status}</Pill>
              </div>

              <div className="mt-3">
                <CategoryChip category={lookups.category(c.categoryId)} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {stats.sent} / {stats.recipients} sent
                  </span>
                  <span className="num">{stats.progress}%</span>
                </div>
                <ProgressBar value={stats.progress} />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border pt-4 text-center">
                <Metric label="Opened" value={stats.opened} />
                <Metric label="Replies" value={stats.replied} />
                <Metric label="Reply rate" value={`${pct(stats.replied, stats.sent)}%`} />
                <Metric label="Won" value={stats.won} />
              </div>

              <div className="mt-4 flex gap-2">
                {c.status === "paused" || c.status === "draft" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      store.updateCampaign(c.id, { status: "sending" });
                      toast.success(`${c.name} resumed`);
                    }}
                  >
                    <Play className="size-3.5" /> Resume
                  </Button>
                ) : c.status === "sending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      store.updateCampaign(c.id, { status: "paused" });
                      toast.message(`${c.name} paused`);
                    }}
                  >
                    <Pause className="size-3.5" /> Pause
                  </Button>
                ) : null}
                {stats.recipients - stats.sent > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const n = store.sendBatch(c.id);
                      toast.success(`${n} emails sent`, { description: `Next batch in ${c.intervalMinutes} minutes.` });
                    }}
                  >
                    <Send className="size-3.5" /> Send next batch
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" asChild className="ml-auto">
                  <Link to="/campaigns/$campaignId" params={{ campaignId: c.id }}>
                    Open
                  </Link>
                </Button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="num text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
