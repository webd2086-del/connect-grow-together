import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarClock,
  Handshake,
  Mail,
  MailOpen,
  Reply,
  Star,
  Trophy,
} from "lucide-react";
import { campaignStats, useFollowUpBuckets, useLookups, useOutreach } from "@/lib/outreach/store";
import { PERIODS, buildSeries, computeTotals, deltaFor, periodDays, type PeriodKey } from "@/lib/outreach/analytics";
import { formatShort, pct, relative } from "@/lib/outreach/format";
import { CategoryChip, KpiCard, ProgressBar, SectionCard } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Overview — OutreachOS" },
      {
        name: "description",
        content: "Live outreach performance: emails sent, replies, interested leads, meetings and clients won.",
      },
      { property: "og:title", content: "Overview — OutreachOS" },
      { property: "og:description", content: "Live outreach performance across every campaign and category." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { user, recipients, prospects, campaigns, activities } = useOutreach();
  const lookups = useLookups();
  const [period, setPeriod] = React.useState<PeriodKey>("30d");
  const days = periodDays(period);

  const totals = React.useMemo(() => computeTotals(recipients, prospects, days), [recipients, prospects, days]);
  const series = React.useMemo(() => buildSeries(recipients, days), [recipients, days]);
  const buckets = useFollowUpBuckets();

  const rows = campaigns.map((c) => ({ campaign: c, stats: campaignStats(c.id, recipients, prospects) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Good evening, {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's how your outreach is performing.</p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Emails Sent" value={totals.sent.toLocaleString()} change={deltaFor("sent", totals.sent)} icon={<Mail className="size-4" />} />
        <KpiCard label="Replies" value={totals.replied} change={deltaFor("replies", totals.replied)} icon={<Reply className="size-4" />} />
        <KpiCard label="Interested" value={totals.positive} change={deltaFor("interested", totals.positive)} icon={<Star className="size-4" />} />
        <KpiCard label="Meetings" value={totals.meetings} change={deltaFor("meetings", totals.meetings)} icon={<Handshake className="size-4" />} />
        <KpiCard label="Clients Won" value={totals.won} change={deltaFor("won", totals.won)} icon={<Trophy className="size-4" />} />
      </div>

      <SectionCard
        title="Outreach Performance"
        description={`Sent, opened and replied · last ${days === 1 ? "24 hours" : `${days} days`}`}
        bodyClassName="p-2 sm:p-4"
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={44} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                  boxShadow: "var(--shadow-pop)",
                }}
              />
              <Area type="monotone" dataKey="sent" stroke="var(--color-chart-1)" fill="url(#gSent)" strokeWidth={2} />
              <Area type="monotone" dataKey="opened" stroke="var(--color-chart-3)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="replied" stroke="var(--color-chart-2)" fill="url(#gReplied)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 px-4 pb-2 text-xs text-muted-foreground">
          <Legend color="var(--color-chart-1)" label="Sent" />
          <Legend color="var(--color-chart-3)" label="Opened" />
          <Legend color="var(--color-chart-2)" label="Replied" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Campaign Performance"
          actions={
            <Link to="/campaigns" className="text-xs font-medium text-primary hover:underline">
              All campaigns
            </Link>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Campaign</th>
                  <th className="px-3 py-2.5 font-medium">Recipients</th>
                  <th className="px-3 py-2.5 font-medium">Sent</th>
                  <th className="px-3 py-2.5 font-medium">Replies</th>
                  <th className="px-3 py-2.5 font-medium">Reply rate</th>
                  <th className="px-3 py-2.5 font-medium">Interested</th>
                  <th className="px-5 py-2.5 font-medium">Won</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ campaign, stats }) => (
                  <tr key={campaign.id} className="border-b border-border/70 last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {campaign.name}
                      </Link>
                      <div className="mt-1">
                        <CategoryChip category={lookups.category(campaign.categoryId)} />
                      </div>
                    </td>
                    <td className="num px-3 py-3 text-muted-foreground">{stats.recipients}</td>
                    <td className="num px-3 py-3 text-muted-foreground">{stats.sent}</td>
                    <td className="num px-3 py-3 text-muted-foreground">{stats.replied}</td>
                    <td className="num px-3 py-3 font-medium text-foreground">{pct(stats.replied, stats.sent)}%</td>
                    <td className="num px-3 py-3 text-muted-foreground">{stats.interested}</td>
                    <td className="num px-5 py-3 text-muted-foreground">{stats.won}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Follow-ups"
          actions={
            <Link to="/follow-ups" className="text-xs font-medium text-primary hover:underline">
              Manage
            </Link>
          }
        >
          <div className="space-y-3">
            <FollowUpRow tone="warn" label="Due today" count={buckets.today.length} />
            <FollowUpRow tone="danger" label="Overdue" count={buckets.overdue.length} />
            <FollowUpRow tone="info" label="Upcoming" count={buckets.upcoming.length} />
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {[...buckets.overdue, ...buckets.today].slice(0, 4).map((f) => {
              const p = lookups.prospect(f.prospectId);
              const c = lookups.campaign(f.campaignId);
              return (
                <div key={f.id} className="flex items-start gap-2.5 text-sm">
                  <CalendarClock className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{p?.company}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c?.name} · due {formatShort(f.dueAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Activity"
        actions={
          <Link to="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all <ArrowRight className="size-3" />
          </Link>
        }
      >
        <ol className="space-y-4">
          {activities.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                {a.type === "email_replied" ? (
                  <Reply className="size-3.5" />
                ) : a.type === "email_opened" ? (
                  <MailOpen className="size-3.5" />
                ) : (
                  <Mail className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{relative(a.at)}</span>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function FollowUpRow({ tone, label, count }: { tone: "warn" | "danger" | "info"; label: string; count: number }) {
  const map = { warn: "status-warn", danger: "status-danger", info: "status-info" } as const;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className={cn("num rounded-full px-2 py-0.5 text-xs font-semibold", map[tone])}>{count}</span>
    </div>
  );
}

export function PeriodPicker({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === p.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
