import { NOW } from "./format";
import type { Activity, CampaignRecipient, Prospect } from "./types";

export type PeriodKey = "today" | "7d" | "30d" | "90d" | "year";

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "year", label: "This year", days: 365 },
];

export function periodDays(key: PeriodKey): number {
  return PERIODS.find((p) => p.key === key)?.days ?? 30;
}

export function windowStart(days: number, base: Date = NOW): Date {
  return new Date(base.getTime() - days * 86400000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface SeriesPoint {
  label: string;
  sent: number;
  opened: number;
  replied: number;
}

/** Builds a bucketed time series of outreach events over the selected window. */
export function buildSeries(recipients: CampaignRecipient[], days: number, base: Date = NOW): SeriesPoint[] {
  const buckets = days <= 1 ? 12 : days <= 7 ? 7 : days <= 30 ? 15 : days <= 90 ? 12 : 12;
  const span = (days * 86400000) / buckets;
  const start = base.getTime() - days * 86400000;
  const points: SeriesPoint[] = Array.from({ length: buckets }, (_, i) => {
    const d = new Date(start + i * span);
    return {
      label:
        days <= 1
          ? `${String(d.getUTCHours()).padStart(2, "0")}:00`
          : days <= 90
            ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
            : `${MONTHS[d.getUTCMonth()]}`,
      sent: 0,
      opened: 0,
      replied: 0,
    };
  });
  const idx = (iso?: string | null) => {
    if (!iso) return -1;
    const t = new Date(iso).getTime();
    if (t < start || t > base.getTime()) return -1;
    return Math.min(buckets - 1, Math.floor((t - start) / span));
  };
  for (const r of recipients) {
    const s = idx(r.sentAt);
    if (s >= 0) points[s]!.sent += 1;
    const o = idx(r.openedAt);
    if (o >= 0) points[o]!.opened += 1;
    const rp = idx(r.repliedAt);
    if (rp >= 0) points[rp]!.replied += 1;
  }
  return points;
}

export interface Totals {
  prospects: number;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  replied: number;
  positive: number;
  meetings: number;
  won: number;
  lost: number;
}

export function computeTotals(
  recipients: CampaignRecipient[],
  prospects: Prospect[],
  days?: number,
  base: Date = NOW,
): Totals {
  const from = days ? base.getTime() - days * 86400000 : 0;
  const inWindow = (iso?: string | null) => !!iso && new Date(iso).getTime() >= from;
  const rows = days ? recipients.filter((r) => inWindow(r.sentAt)) : recipients;
  const sent = rows.filter((r) => r.sentAt).length;
  const bounced = rows.filter((r) => r.state === "bounced").length;
  const opened = rows.filter((r) => r.openedAt).length;
  const replied = rows.filter((r) => r.repliedAt).length;
  const statusOf = (id: string) => prospects.find((p) => p.id === id)?.status;
  const positive = rows.filter((r) =>
    ["interested", "meeting", "negotiating", "won"].includes(statusOf(r.prospectId) ?? ""),
  ).length;
  return {
    prospects: prospects.length,
    sent,
    delivered: sent - bounced,
    bounced,
    opened,
    clicked: Math.round(opened * 0.31),
    replied,
    positive,
    meetings: rows.filter((r) => ["meeting", "negotiating"].includes(statusOf(r.prospectId) ?? "")).length,
    won: rows.filter((r) => statusOf(r.prospectId) === "won").length,
    lost: rows.filter((r) => ["lost", "not_interested"].includes(statusOf(r.prospectId) ?? "")).length,
  };
}

/** Deterministic "previous period" delta so KPI cards can show trend. */
export function deltaFor(metric: string, value: number): number {
  let h = 0;
  for (const ch of metric) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const magnitude = ((h % 240) / 10) - 6 + (value % 7) * 0.4;
  return Math.round(magnitude * 10) / 10;
}

export function activitiesInWindow(activities: Activity[], days: number, base: Date = NOW): Activity[] {
  const from = base.getTime() - days * 86400000;
  return activities.filter((a) => new Date(a.at).getTime() >= from);
}
