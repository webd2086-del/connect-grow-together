import type { LeadStatus } from "./types";

/** Fixed reference "now" so SSR and client render identically for demo data. */
export const NOW = new Date("2026-08-23T20:00:00.000Z");

export function daysAgo(n: number, base: Date = NOW): string {
  const d = new Date(base.getTime() - n * 86400000);
  return d.toISOString();
}

export function hoursAgo(n: number, base: Date = NOW): string {
  return new Date(base.getTime() - n * 3600000).toISOString();
}

export function inDays(n: number, base: Date = NOW): string {
  return new Date(base.getTime() + n * 86400000).toISOString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatShort(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function relative(iso?: string | null, base: Date = NOW): string {
  if (!iso) return "—";
  const diff = base.getTime() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ${suffix}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ${suffix}`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ${suffix}`;
  return `${Math.round(days / 30)}mo ${suffix}`;
}

export function pct(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "status-neutral",
  contacted: "status-info",
  opened: "status-info",
  replied: "status-accent",
  interested: "status-accent",
  meeting: "status-warn",
  negotiating: "status-warn",
  won: "status-success",
  lost: "status-danger",
  not_interested: "status-danger",
  do_not_contact: "status-danger",
};

export function applyVariables(
  text: string,
  vars: Record<string, string | undefined>,
): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => vars[key.toLowerCase()] ?? `{{${key}}}`);
}

export function firstName(contactName: string): string {
  return contactName.split(" ")[0] ?? contactName;
}
