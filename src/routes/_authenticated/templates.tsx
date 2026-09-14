import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOutreach } from "@/lib/outreach/store";
import { CategoryChip, PageHeader, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/routes/_authenticated/prospects.index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Templates — OutreachOS" },
      { name: "description", content: "A reusable email template library with usage, reply rate and conversion stats." },
      { property: "og:title", content: "Templates — OutreachOS" },
      { property: "og:description", content: "See which outreach templates actually produce replies and clients." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const store = useOutreach();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    categoryId: store.categories[0]?.id ?? "",
    subject: "",
    body: "",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Reusable emails with variables. Performance data shows which openers actually work."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New template
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {store.templates.map((t) => (
          <SectionCard key={t.id} bodyClassName="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.subject}</p>
              </div>
              <CategoryChip category={store.categories.find((c) => c.id === t.categoryId)} />
            </div>

            <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
              <Stat label="Used" value={`${t.timesUsed}×`} />
              <Stat label="Reply rate" value={`${t.replyRate}%`} />
              <Stat label="Won" value={String(t.won)} />
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${t.subject}\n\n${t.body}`);
                  toast.success("Template copied");
                }}
              >
                <Copy className="size-3.5" /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                onClick={() => {
                  store.deleteTemplate(t.id);
                  toast.message("Template deleted");
                }}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </SectionCard>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>Variables like {"{{first_name}}"} are replaced per recipient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
              >
                {store.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Body">
              <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Give the template a name");
                  return;
                }
                store.saveTemplate(form);
                toast.success("Template saved");
                setOpen(false);
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="num text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
