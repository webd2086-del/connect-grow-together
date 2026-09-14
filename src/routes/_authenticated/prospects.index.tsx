import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Filter, Plus, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useLookups, useOutreach } from "@/lib/outreach/store";
import { LEAD_STATUSES, STATUS_LABEL, type LeadStatus } from "@/lib/outreach/types";
import { formatShort, relative } from "@/lib/outreach/format";
import { CategoryChip, EmptyState, PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/prospects/")({
  head: () => ({
    meta: [
      { title: "Prospects — OutreachOS" },
      { name: "description", content: "Search, filter and segment every company and contact in your outreach database." },
      { property: "og:title", content: "Prospects — OutreachOS" },
      { property: "og:description", content: "Your full prospect database with statuses, categories and history." },
    ],
  }),
  component: ProspectsPage,
});

const PAGE_SIZE = 12;

function ProspectsPage() {
  const { prospects, categories, campaigns, recipients, addProspect, ready } = useOutreach();
  const lookups = useLookups();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<LeadStatus | "all">("all");
  const [category, setCategory] = React.useState("all");
  const [campaign, setCampaign] = React.useState("all");
  const [country, setCountry] = React.useState("all");
  const [followUpDue, setFollowUpDue] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<"company" | "recent">("recent");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [openNew, setOpenNew] = React.useState(false);

  const countries = React.useMemo(
    () => Array.from(new Set(prospects.map((p) => p.country))).sort(),
    [prospects],
  );

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const campaignProspects = new Set(
      campaign === "all" ? [] : recipients.filter((r) => r.campaignId === campaign).map((r) => r.prospectId),
    );
    let list = prospects.filter((p) => {
      if (term && ![p.company, p.contactName, p.email, p.city, p.industry ?? ""].join(" ").toLowerCase().includes(term))
        return false;
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && p.categoryId !== category) return false;
      if (country !== "all" && p.country !== country) return false;
      if (campaign !== "all" && !campaignProspects.has(p.id)) return false;
      if (followUpDue && !p.nextFollowUpAt) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === "company"
        ? a.company.localeCompare(b.company)
        : (b.lastContactedAt ?? b.createdAt).localeCompare(a.lastContactedAt ?? a.createdAt),
    );
    return list;
  }, [prospects, q, status, category, country, campaign, followUpDue, sort, recipients]);

  React.useEffect(() => setPage(1), [q, status, category, country, campaign, followUpDue]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allSelected = slice.length > 0 && slice.every((p) => selected.includes(p.id));

  const activeFilters =
    (status !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (country !== "all" ? 1 : 0) +
    (campaign !== "all" ? 1 : 0) +
    (followUpDue ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description={`${prospects.length} companies across ${categories.length} outreach categories`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/import">
                <Upload className="size-4" /> Import CSV
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success(`${filtered.length} prospects exported`, { description: "CSV ready to download." })}
            >
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="size-4" /> Add prospect
            </Button>
          </>
        }
      />

      <div className="surface-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, contact, email or city…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(v) => setStatus(v as LeadStatus | "all")} label="Status">
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Select value={category} onChange={setCategory} label="Category">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
            <Select value={campaign} onChange={setCampaign} label="Campaign">
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={country} onChange={setCountry} label="Country">
              <option value="all">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <button
              onClick={() => setFollowUpDue((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                followUpDue ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground",
              )}
            >
              <Filter className="size-3.5" /> Follow-up due
            </button>
            {activeFilters > 0 ? (
              <button
                className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStatus("all");
                  setCategory("all");
                  setCountry("all");
                  setCampaign("all");
                  setFollowUpDue(false);
                }}
              >
                <X className="size-3.5" /> Clear
              </button>
            ) : null}
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
            <span className="font-medium">{selected.length} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/campaigns/new">Add to campaign</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast.success(`${selected.length} prospects tagged`);
                  setSelected([]);
                }}
              >
                Tag
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="surface-card overflow-hidden">
        {!ready ? (
          <SkeletonTable />
        ) : slice.length === 0 ? (
          <EmptyState
            title="No prospects match these filters"
            description="Try widening your search, or import a fresh list of companies to start reaching out."
            action={
              <Button asChild>
                <Link to="/import">Import prospects</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select page"
                      checked={allSelected}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Array.from(new Set([...selected, ...slice.map((p) => p.id)]))
                            : selected.filter((id) => !slice.some((p) => p.id === id)),
                        )
                      }
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => setSort(sort === "company" ? "recent" : "company")} className="hover:text-foreground">
                      Company
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Last contacted</th>
                  <th className="px-4 py-3 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((p) => (
                  <tr key={p.id} className="border-b border-border/70 last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.company}`}
                        checked={selected.includes(p.id)}
                        onChange={(e) =>
                          setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        to="/prospects/$prospectId"
                        params={{ prospectId: p.id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {p.company}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.industry}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-foreground">{p.contactName}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <CategoryChip category={lookups.category(p.categoryId)} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {p.city}, {p.country}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{relative(p.lastContactedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatShort(p.nextFollowUpAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {slice.length > 0 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <NewProspectDialog open={openNew} onOpenChange={setOpenNew} onCreate={addProspect} />
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {children}
    </select>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function NewProspectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: ReturnType<typeof useOutreach>["addProspect"];
}) {
  const { categories } = useOutreach();
  const [form, setForm] = React.useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    country: "Kenya",
    city: "",
    categoryId: categories[0]?.id ?? "",
    notes: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
          <DialogDescription>Create a new company record in your outreach database.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <Input value={form.company} onChange={set("company")} placeholder="ABC International School" />
          </Field>
          <Field label="Contact person">
            <Input value={form.contactName} onChange={set("contactName")} placeholder="John Doe" />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={set("email")} placeholder="john@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} placeholder="+254 700 000 000" />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={set("website")} placeholder="www.example.com" />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={set("industry")} placeholder="School" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={set("country")} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={set("city")} placeholder="Nairobi" />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Context, source, next step…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.company.trim() || !form.email.includes("@")) {
                toast.error("A company name and valid email are required");
                return;
              }
              onCreate({ ...form, tags: [] });
              toast.success(`${form.company} added`);
              onOpenChange(false);
            }}
          >
            Add prospect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
