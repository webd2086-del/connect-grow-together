import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOutreach } from "@/lib/outreach/store";
import { PageHeader, Pill, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/routes/_authenticated/prospects.index";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OutreachOS" },
      { name: "description", content: "Manage workspace profile, outreach categories, sending defaults and integrations." },
      { property: "og:title", content: "Settings — OutreachOS" },
      { property: "og:description", content: "Categories, purposes, sending rules and email provider integrations." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const store = useOutreach();
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("✨");
  const [purposes, setPurposes] = React.useState("");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, categories and integrations." />

      <SectionCard title="Workspace">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Owner">
            <Input readOnly value={store.user.name} />
          </Field>
          <Field label="Email">
            <Input readOnly value={store.user.email} />
          </Field>
          <Field label="Workspace">
            <Input readOnly value={store.user.workspace} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Categories" description="Each category groups prospects, campaigns and a sending address.">
        <div className="space-y-3">
          {store.categories.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <span className="text-lg">{c.icon}</span>
              <Input
                value={c.name}
                onChange={(e) => store.updateCategory(c.id, { name: e.target.value })}
                className="h-9 w-48"
              />
              <div className="flex flex-wrap gap-1.5">
                {c.purposes.map((p) => (
                  <Pill key={p}>{p}</Pill>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                onClick={() => {
                  store.deleteCategory(c.id);
                  toast.success("Category removed");
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[80px_1fr_2fr_auto] sm:items-end">
          <Field label="Icon">
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event Planning" />
          </Field>
          <Field label="Purposes (comma separated)">
            <Input value={purposes} onChange={(e) => setPurposes(e.target.value)} placeholder="Partnership, Sponsorship" />
          </Field>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Give the category a name");
                return;
              }
              store.addCategory({
                name: name.trim(),
                icon: icon || "✨",
                color: "chart-1",
                purposes: purposes
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              });
              setName("");
              setPurposes("");
              toast.success("Category added");
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Integrations"
        description="Your workspace data is stored securely in your account."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Prospects, campaigns and history are saved to your private workspace — nothing lives only in this browser.
            Gmail can be connected from the Email Accounts page using Google sign-in; no password is ever stored.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Gmail connects through Google's own consent screen</li>
            <li>Access is stored encrypted and only for your account</li>
            <li>Each sending address keeps its own daily limit</li>
            <li>Outlook can be added next if you need a second provider</li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" description="Clear this workspace and start again with the four base categories.">

        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => {
            store.reset();
            toast.success("Workspace reset to demo data");
          }}
        >
          <RotateCcw className="size-4" /> Reset workspace
        </Button>
      </SectionCard>
    </div>
  );
}
