import * as React from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Globe,
  Mail,
  MailOpen,
  Phone,
  Reply,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useLookups, useOutreach } from "@/lib/outreach/store";
import { LEAD_STATUSES, STATUS_LABEL, type LeadStatus } from "@/lib/outreach/types";
import { formatDate, formatShort, inDays, relative } from "@/lib/outreach/format";
import { CategoryChip, EmptyState, SectionCard, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/prospects/$prospectId")({
  head: () => ({
    meta: [
      { title: "Prospect profile — OutreachOS" },
      { name: "description", content: "Full company profile with contact details and a chronological outreach timeline." },
      { property: "og:title", content: "Prospect profile — OutreachOS" },
      { property: "og:description", content: "Every email, open, reply and follow-up for this company in one view." },
    ],
  }),
  component: ProspectProfile,
});

function ProspectProfile() {
  const { prospectId } = useParams({ from: "/_authenticated/prospects/$prospectId" });
  const store = useOutreach();
  const lookups = useLookups();
  const prospect = store.prospects.find((p) => p.id === prospectId);
  const [notes, setNotes] = React.useState(prospect?.notes ?? "");

  if (!prospect) {
    return (
      <EmptyState
        title="Prospect not found"
        description="This record may have been deleted."
        action={
          <Button asChild>
            <Link to="/prospects">Back to prospects</Link>
          </Button>
        }
      />
    );
  }

  const rows = store.recipients.filter((r) => r.prospectId === prospect.id);
  const timeline = store.activities
    .filter((a) => a.prospectId === prospect.id)
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const followUps = store.followUps.filter((f) => f.prospectId === prospect.id && f.status === "pending");

  return (
    <div className="space-y-6">
      <Link to="/prospects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Prospects
      </Link>

      <div className="surface-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent text-lg font-semibold text-accent-foreground">
              {prospect.company.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{prospect.company}</h1>
              <p className="text-sm text-muted-foreground">
                {prospect.industry} · {prospect.city}, {prospect.country}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={prospect.status} />
                <CategoryChip category={lookups.category(prospect.categoryId)} />
                {prospect.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lead status"
              value={prospect.status}
              onChange={(e) => {
                store.setProspectStatus(prospect.id, e.target.value as LeadStatus);
                toast.success(`Marked ${STATUS_LABEL[e.target.value as LeadStatus]}`);
              }}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => {
                const campaignId = rows[0]?.campaignId ?? store.campaigns[0]?.id;
                if (!campaignId) return;
                store.scheduleFollowUp(prospect.id, campaignId, inDays(3));
                toast.success("Follow-up scheduled in 3 days");
              }}
            >
              <CalendarClock className="size-4" /> Schedule follow-up
            </Button>
            <Button asChild>
              <Link to="/campaigns/new">
                <Mail className="size-4" /> New email
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Delete prospect">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {prospect.company}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the prospect and its outreach history from your workspace. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      store.deleteProspect(prospect.id);
                      toast.success("Prospect deleted");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail icon={<Mail className="size-4" />} label={prospect.contactName} value={prospect.email} />
          <Detail icon={<Phone className="size-4" />} label="Phone" value={prospect.phone ?? "—"} />
          <Detail icon={<Globe className="size-4" />} label="Website" value={prospect.website ?? "—"} />
          <Detail
            icon={<CalendarClock className="size-4" />}
            label="Next follow-up"
            value={formatDate(prospect.nextFollowUpAt)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Activity timeline" description="Every touchpoint with this company">
          {timeline.length === 0 ? (
            <EmptyState title="No activity yet" description="Add this prospect to a campaign to start the conversation." />
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-6">
              {timeline.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground">
                    {a.type === "email_replied" ? (
                      <Reply className="size-3" />
                    ) : a.type === "email_opened" ? (
                      <MailOpen className="size-3" />
                    ) : a.type === "status_changed" ? (
                      <Star className="size-3" />
                    ) : a.type === "follow_up_scheduled" ? (
                      <CalendarClock className="size-3" />
                    ) : (
                      <Mail className="size-3" />
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatShort(a.at)}</p>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  {a.detail ? <p className="text-sm text-muted-foreground">{a.detail}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Outreach history" bodyClassName="p-0">
            {rows.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Not yet included in any campaign.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const c = lookups.campaign(r.campaignId);
                  return (
                    <li key={r.id} className="p-4">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: r.campaignId }}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {c?.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.subject}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Sent {formatShort(r.sentAt)}</span>
                        <span>{r.openCount} opens</span>
                        <span>{r.repliedAt ? `Replied ${formatShort(r.repliedAt)}` : "No reply"}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Pending follow-ups">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {followUps.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span>Step {f.step}</span>
                    <span className="text-xs text-muted-foreground">due {formatShort(f.dueAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Add context…" />
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => {
                store.updateProspect(prospect.id, { notes });
                toast.success("Notes saved");
              }}
            >
              Save notes
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Last response {relative(prospect.lastResponseAt)} · created {formatDate(prospect.createdAt)}
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
