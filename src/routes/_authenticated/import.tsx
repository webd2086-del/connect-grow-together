import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useOutreach } from "@/lib/outreach/store";
import { EmptyState, PageHeader, Pill, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/routes/_authenticated/prospects.index";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import prospects — OutreachOS" },
      { name: "description", content: "Upload a CSV, preview rows, catch invalid emails and duplicates, then import." },
      { property: "og:title", content: "Import prospects — OutreachOS" },
      { property: "og:description", content: "Bring a list of companies into your outreach database in seconds." },
    ],
  }),
  component: ImportPage,
});

const SAMPLE = `Company,Contact Name,Email,Phone,Website,Category,Country,City
Sunrise Academy,Mercy Wanjiku,mercy@sunrise.ac.ke,+254700111222,www.sunrise.ac.ke,Schools,Kenya,Thika
Blue Bay Resort,Omar Said,omar@bluebay.co.ke,+254700333444,www.bluebay.co.ke,Tour & Travel,Kenya,Watamu
Nexa Logistics,Alex Kimani,alex(at)nexa,+254700555666,www.nexa.co.ke,Software Development,Kenya,Nairobi`;

interface Row {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  category: string;
  country: string;
  city: string;
  valid: boolean;
  duplicate: boolean;
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((c) => c.trim()));
}

function ImportPage() {
  const store = useOutreach();
  const navigate = useNavigate();
  const [raw, setRaw] = React.useState("");
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [dupMode, setDupMode] = React.useState<"skip" | "import">("skip");

  const analyse = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("Add a header row and at least one data row");
      return;
    }
    const body = parsed.slice(1);
    const existing = new Set(store.prospects.map((p) => p.email.toLowerCase()));
    const result: Row[] = body.map((cells) => {
      const [company = "", contactName = "", email = "", phone = "", website = "", category = "", country = "", city = ""] =
        cells;
      return {
        company,
        contactName,
        email,
        phone,
        website,
        category,
        country,
        city,
        valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && company.length > 0,
        duplicate: existing.has(email.toLowerCase()),
      };
    });
    setRows(result);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    analyse(text);
  };

  const valid = rows?.filter((r) => r.valid) ?? [];
  const invalid = rows?.filter((r) => !r.valid) ?? [];
  const duplicates = valid.filter((r) => r.duplicate);
  const toImport = dupMode === "skip" ? valid.filter((r) => !r.duplicate) : valid;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import prospects"
        description="Company, Contact Name, Email, Phone, Website, Category, Country, City"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Upload CSV">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center hover:border-ring/50">
            <Upload className="mb-2 size-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Choose a CSV file</span>
            <span className="text-xs text-muted-foreground">or paste the rows below</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>

          <div className="mt-4">
            <Field label="Paste CSV">
              <Textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={SAMPLE} />
            </Field>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => analyse(raw)} disabled={!raw.trim()}>
                <FileSpreadsheet className="size-4" /> Preview rows
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRaw(SAMPLE);
                  analyse(SAMPLE);
                }}
              >
                Use sample
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Validation" description="Checked before anything is written">
          {!rows ? (
            <EmptyState title="Nothing to preview yet" description="Upload or paste a CSV to see the checks." />
          ) : (
            <div className="space-y-3">
              <Check tone="success" label={`${valid.length} valid rows`} />
              <Check tone="danger" label={`${invalid.length} invalid emails or missing company`} />
              <Check tone="warn" label={`${duplicates.length} already in your database`} />
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">Duplicates</p>
                <div className="mt-2 flex gap-2">
                  {(["skip", "import"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDupMode(m)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        dupMode === m ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {m === "skip" ? "Skip duplicates" : "Import anyway"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={toImport.length === 0}
                onClick={() => {
                  const count = store.addProspects(
                    toImport.map((r) => ({
                      company: r.company,
                      contactName: r.contactName,
                      email: r.email,
                      phone: r.phone,
                      website: r.website,
                      industry: r.category,
                      country: r.country || "Kenya",
                      city: r.city,
                      categoryId:
                        store.categories.find((c) => c.name.toLowerCase() === r.category.toLowerCase())?.id ??
                        store.categories[0]!.id,
                      tags: ["imported"],
                    })),
                  );
                  toast.success(`${count} prospects imported`);
                  void navigate({ to: "/prospects" });
                }}
              >
                Import {toImport.length} prospects
              </Button>
            </div>
          )}
        </SectionCard>
      </div>

      {rows ? (
        <SectionCard title="Preview" description={`${rows.length} rows parsed`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{r.company}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.contactName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-3 py-3 text-muted-foreground">{r.category}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {r.city}
                      {r.country ? `, ${r.country}` : ""}
                    </td>
                    <td className="px-5 py-3">
                      {!r.valid ? (
                        <Pill tone="danger">invalid</Pill>
                      ) : r.duplicate ? (
                        <Pill tone="warn">duplicate</Pill>
                      ) : (
                        <Pill tone="success">ok</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function Check({ tone, label }: { tone: "success" | "danger" | "warn"; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      {tone === "success" ? (
        <CheckCircle2 className="size-4 text-success" />
      ) : (
        <AlertTriangle className={tone === "danger" ? "size-4 text-destructive" : "size-4 text-warning"} />
      )}
      {label}
    </div>
  );
}
