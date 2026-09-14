import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { campaignStats, useOutreach } from "@/lib/outreach/store";
import { PERIODS, buildSeries, computeTotals, periodDays, type PeriodKey } from "@/lib/outreach/analytics";
import { pct } from "@/lib/outreach/format";
import { PageHeader, SectionCard } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — OutreachOS" },
      { name: "description", content: "Delivery, open, reply and conversion rates with funnels and category comparisons." },
      { property: "og:title", content: "Analytics — OutreachOS" },
      { property: "og:description", content: "See which campaigns and categories actually produce clients." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const store = useOutreach();
  const [period, setPeriod] = React.useState<PeriodKey>("90d");
  const days = periodDays(period);

  const totals = computeTotals(store.recipients, store.prospects, days);
  const series = buildSeries(store.recipients, days);

  const campaignRows = store.campaigns.map((c) => {
    const s = campaignStats(c.id, store.recipients, store.prospects);
    return { name: c.name, sent: s.sent, replies: s.replied, won: s.won };
  });

  const categoryRows = store.categories.map((cat) => {
    const ids = new Set(store.campaigns.filter((c) => c.categoryId === cat.id).map((c) => c.id));
    const rows = store.recipients.filter((r) => ids.has(r.campaignId));
    const sent = rows.filter((r) => r.sentAt).length;
    const replied = rows.filter((r) => r.repliedAt).length;
    const won = rows.filter((r) => store.prospects.find((p) => p.id === r.prospectId)?.status === "won").length;
    return { name: `${cat.icon} ${cat.name}`, sent, replied, won, replyRate: pct(replied, sent) };
  });

  const funnel = [
    { label: "Prospects", value: store.prospects.length },
    { label: "Emails Sent", value: totals.sent },
    { label: "Delivered", value: totals.delivered },
    { label: "Opened", value: totals.opened },
    { label: "Replied", value: totals.replied },
    { label: "Interested", value: totals.positive },
    { label: "Meeting", value: totals.meetings },
    { label: "Won", value: totals.won },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Outreach performance across every campaign, category and period."
        actions={
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  period === p.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total prospects" value={totals.prospects} />
        <Metric label="Emails sent" value={totals.sent} />
        <Metric label="Delivered" value={totals.delivered} />
        <Metric label="Bounced" value={totals.bounced} />
        <Metric label="Opened" value={totals.opened} />
        <Metric label="Clicked" value={totals.clicked} />
        <Metric label="Replies" value={totals.replied} />
        <Metric label="Positive replies" value={totals.positive} />
        <Metric label="Meetings" value={totals.meetings} />
        <Metric label="Won" value={totals.won} />
        <Metric label="Lost" value={totals.lost} />
        <Metric label="Conversion rate" value={`${pct(totals.won, totals.sent)}%`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Rate label="Delivery rate" value={pct(totals.delivered, totals.sent)} />
        <Rate label="Open rate" value={pct(totals.opened, totals.delivered)} />
        <Rate label="Reply rate" value={pct(totals.replied, totals.delivered)} />
        <Rate label="Positive reply rate" value={pct(totals.positive, totals.replied)} />
        <Rate label="Conversion rate" value={pct(totals.won, totals.sent)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Outreach over time" bodyClassName="p-3">
          <ChartBox>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="sent" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title="Replies over time" bodyClassName="p-3">
          <ChartBox>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="replied" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title="Campaign comparison" bodyClassName="p-3">
          <ChartBox>
            <BarChart data={campaignRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} height={50} angle={-15} textAnchor="end" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sent" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replies" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="won" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title="Conversion funnel">
          <ul className="space-y-2.5">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="num font-medium text-foreground">{f.value}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${Math.max(2, (f.value / funnelMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Category performance" description="Which service lines convert best" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Sent</th>
                <th className="px-3 py-3 font-medium">Replies</th>
                <th className="px-3 py-3 font-medium">Reply rate</th>
                <th className="px-5 py-3 font-medium">Won</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((c) => (
                <tr key={c.name} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="num px-3 py-3 text-muted-foreground">{c.sent}</td>
                  <td className="num px-3 py-3 text-muted-foreground">{c.replied}</td>
                  <td className="num px-3 py-3 font-medium text-foreground">{c.replyRate}%</td>
                  <td className="num px-5 py-3 text-muted-foreground">{c.won}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  fontSize: 12,
  boxShadow: "var(--shadow-pop)",
};

function ChartBox({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-card p-4">
      <p className="num text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Rate({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold text-foreground">{value}%</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
