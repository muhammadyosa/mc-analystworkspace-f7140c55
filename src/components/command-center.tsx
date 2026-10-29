import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  LayoutDashboard,
  UserSearch,
  ListTodo,
  FileText,
  Database,
  Target,
  Users,
  Radar,
  Settings,
  MapPin,
  UserRound,
  Upload,
  PlusCircle,
  FileBarChart,
  Download,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDataStore } from "@/lib/store";
import { useRole } from "@/hooks/use-role";
import { useMenuSearch } from "@/hooks/use-menu-state";

const pages = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analyst Market", url: "/analyst", icon: UserSearch },
  { title: "Action Plan", url: "/action-plan", icon: ListTodo },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Master Cluster", url: "/master", icon: Database },
  { title: "Priority Engine", url: "/priority", icon: Target },
  { title: "Customer Loyalty", url: "/loyalty", icon: Users },
  { title: "Competitor Intelligence", url: "/competitor-intel", icon: Radar },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
] as const;

/** Pencarian cepat lintas menu, cluster, dan PIC. Dibuka dengan Ctrl/Cmd + K. */
export function CommandCenter() {
  const menuSearch = useMenuSearch();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const clusters = useDataStore((s) => s.clusters);
  const actionPlans = useDataStore((s) => s.actionPlans);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clusterList = useMemo(
    () =>
      Array.from(new Set(clusters.map((c) => c.cluster).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 300),
    [clusters],
  );

  const picList = useMemo(
    () =>
      Array.from(
        new Set([...clusters.map((c) => c.pic), ...actionPlans.map((a) => a.pic)].filter(Boolean)),
      )
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 100),
    [clusters, actionPlans],
  );

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Pencarian cepat"
        className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cari…</span>
        <kbd className="hidden rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium lg:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Cari menu, cluster, PIC, atau aksi cepat…" />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          <CommandGroup heading="Aksi Cepat">
            <CommandItem
              value="aksi upload data impor excel"
              onSelect={() => go(() => navigate({ to: "/settings/data" }))}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload Data
            </CommandItem>
            <CommandItem
              value="aksi buat action plan baru"
              onSelect={() => go(() => navigate({ to: "/action-plan" }))}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Action Plan
            </CommandItem>
            <CommandItem
              value="aksi generate report laporan"
              onSelect={() => go(() => navigate({ to: "/reports" }))}
            >
              <FileBarChart className="mr-2 h-4 w-4" /> Generate Report
            </CommandItem>
            <CommandItem
              value="aksi export data unduh"
              onSelect={() => go(() => navigate({ to: "/settings/data" }))}
            >
              <Download className="mr-2 h-4 w-4" /> Export Data
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Menu">
            {pages
              .filter((p) => !("adminOnly" in p && p.adminOnly) || isAdmin)
              .map((p) => (
                <CommandItem
                  key={p.url}
                  value={`menu ${p.title}`}
                  onSelect={() => go(() => navigate({ to: p.url, search: menuSearch(p.url) }))}
                >
                  <p.icon className="mr-2 h-4 w-4" />
                  {p.title}
                </CommandItem>
              ))}
          </CommandGroup>
          {clusterList.length > 0 && (
            <CommandGroup heading="Cluster">
              {clusterList.map((name) => (
                <CommandItem
                  key={name}
                  value={`cluster ${name}`}
                  onSelect={() => go(() => navigate({ to: "/cluster/$name", params: { name } }))}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {actionPlans.length > 0 && (
            <CommandGroup heading="Action Plan">
              {actionPlans.slice(0, 50).map((a) => (
                <CommandItem
                  key={a.id}
                  value={`action plan program ${a.program} ${a.cluster} ${a.pic}`}
                  onSelect={() => go(() => navigate({ to: "/action-plan" }))}
                >
                  <ListTodo className="mr-2 h-4 w-4" />
                  <span className="truncate">{a.program}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {picList.length > 0 && (
            <CommandGroup heading="PIC">
              {picList.map((pic) => (
                <CommandItem
                  key={pic}
                  value={`pic ${pic}`}
                  onSelect={() => go(() => navigate({ to: "/action-plan" }))}
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  {pic}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
