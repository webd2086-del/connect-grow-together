import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  Mail,
  MailOpen,
  Megaphone,
  RefreshCw,
  Reply,
  UserPlus,
} from "lucide-react";
import { useOutreach } from "@/lib/outreach/store";
import { formatDate, relative } from "@/lib/outreach/format";
import { EmptyState, PageHeader, SectionCard } from "@/components/app/primitives";
import { Input } from "@/components/ui/input";
import { Select } from "@/routes/_authenticated/prospects.index";
import type { ActivityType } from "@/lib/outreach/types";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity — OutreachOS" },
      { name: "description", content: "A complete audit log of sends, opens, replies, follow-ups and campaign changes." },
      { property: "og:title", content: "Activity — OutreachOS" },
      { property: "og:description", content: "Every event in your outreach workspace, filterable by type and category." },
    ],
  }),
  component: ActivityPage,
});

const TYPE_LABEL: Record<ActivityType, string> = {
  email_sent: "Email sent",
  email_opened: "Email opened",
  email_replied: "Email replied",
  email_bounced: "Email bounced",
  prospect_created: "Prospect created",
  prospect_updated: "Prospect updated",
  campaign_started: "Campaign started",
  campaign_paused: "Campaign paused",
  campaign_completed: "Campaign completed",
  follow_up_scheduled: "Follow-up scheduled",
  follow_up_sent: "Follow-up sent",
  account_synced: "Account synchronised",
  status_changed: "Status changed",
};

function icon(type: ActivityType) {
  switch (type) {
    case "email_replied":
      return <Reply className="size-3.5" />;
    case "email_opened":
      return <MailOpen className="size-3.5" />;
    case "prospect_created":
    case "prospect_updated":
      return <UserPlus className="size-3.5" />;
    case "campaign_started":
    case "campaign_paused":
      return <Megaphone className="size-3.5" />;
    case "campaign_completed":
      return <CheckCircle2 className="size-3.5" />;
    case "follow_up_scheduled":
    case "follow_up_sent":
      return <CalendarClock className="size-3.5" />;
    case "account_synced":
      return <RefreshCw className="size-3.5" />;
    default:
      return <Mail className="size-3.5" />;
  }
}

function ActivityPage() {
  const store = useOutreach();
  const [type, setType] = React.useState<ActivityType | "all">("all");
  const [category, setCategory] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [limit, setLimit] = React.useState(40);

  const list = store.activities.filter((a) => {
    if (type !== "all" && a.type !== type) return false;
    if (category !== "all" && a.categoryId !== category) return false;
    if (from && new Date(a.at) < new Date(from)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Full audit trail of everything happening across your outreach." />

      <div className="surface-card flex flex-wrap items-center gap-2 p-4">
        <Select value={type} onChange={(v) => setType(v as ActivityType | "all")} label="Activity type">
          <option value="all">All activity</option>
          {(Object.keys(TYPE_LABEL) as ActivityType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={setCategory} label="Category">
          <option value="all">All categories</option>
          {store.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto" />
        <span className="ml-auto text-sm text-muted-foreground">{list.length} events</span>
      </div>

      <SectionCard bodyClassName="p-0">
        {list.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No activity in this range" description="Adjust the filters to see more events." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.slice(0, limit).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  {icon(a.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {TYPE_LABEL[a.type]}
                    {a.detail ? ` · ${a.detail}` : ""}
                  </p>
                  <div className="mt-1 flex gap-3 text-xs">
                    {a.prospectId ? (
                      <Link
                        to="/prospects/$prospectId"
                        params={{ prospectId: a.prospectId }}
                        className="text-primary hover:underline"
                      >
                        View prospect
                      </Link>
                    ) : null}
                    {a.campaignId ? (
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: a.campaignId }}
                        className="text-primary hover:underline"
                      >
                        View campaign
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="whitespace-nowrap text-right text-xs text-muted-foreground">
                  <p>{relative(a.at)}</p>
                  <p>{formatDate(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {list.length > limit ? (
          <div className="border-t border-border p-4 text-center">
            <button onClick={() => setLimit((l) => l + 40)} className="text-sm font-medium text-primary hover:underline">
              Load more
            </button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
