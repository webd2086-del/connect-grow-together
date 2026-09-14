import * as React from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  BarChart3,
  Building2,
  CalendarClock,
  ChevronsUpDown,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOutreach } from "@/lib/outreach/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/prospects", label: "Prospects", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { to: "/templates", label: "Templates", icon: Mail },
  { to: "/accounts", label: "Email Accounts", icon: Building2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const { user, prospects, campaigns } = useOutreach();
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">OutreachOS</p>
          <p className="text-[11px] text-muted-foreground">{user.workspace}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.to)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
        <div className="pt-3">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent/60">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border shadow-pop">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <button
            className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
          <button
            onClick={() => setCmdOpen(true)}
            className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search prospects, campaigns…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
              ⌘K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/campaigns/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Megaphone className="size-4" />
              <span className="hidden sm:inline">New campaign</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search prospects, campaigns and pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV.map((item) => (
              <CommandItem
                key={item.to}
                value={`go ${item.label}`}
                onSelect={() => {
                  setCmdOpen(false);
                  void navigate({ to: item.to });
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Campaigns">
            {campaigns.slice(0, 6).map((c) => (
              <CommandItem
                key={c.id}
                value={`campaign ${c.name}`}
                onSelect={() => {
                  setCmdOpen(false);
                  void navigate({ to: "/campaigns/$campaignId", params: { campaignId: c.id } });
                }}
              >
                <Megaphone className="size-4" />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Prospects">
            {prospects.slice(0, 40).map((p) => (
              <CommandItem
                key={p.id}
                value={`prospect ${p.company} ${p.contactName} ${p.email}`}
                onSelect={() => {
                  setCmdOpen(false);
                  void navigate({ to: "/prospects/$prospectId", params: { prospectId: p.id } });
                }}
              >
                <Users className="size-4" />
                <span>{p.company}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.contactName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
