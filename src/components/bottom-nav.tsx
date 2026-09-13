import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  LayoutDashboard,
  UserSearch,
  ListTodo,
  FileText,
  MoreHorizontal,
  Database,
  Target,
  Users,
  Radar,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useRole } from "@/hooks/use-role";
import { useInstallPrompt } from "@/components/install-app";
import { cn } from "@/lib/utils";

const primary = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analyst", url: "/analyst", icon: UserSearch },
  { title: "Action", url: "/action-plan", icon: ListTodo },
  { title: "Reports", url: "/reports", icon: FileText },
];

const secondary = [
  { title: "Master Cluster", url: "/master", icon: Database },
  { title: "Data Health", url: "/data-health", icon: Activity },
  { title: "Priority Engine", url: "/priority", icon: Target },
  { title: "Customer Loyalty", url: "/loyalty", icon: Users },
  { title: "Competitor Intelligence", url: "/competitor-intel", icon: Radar },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
];

/** Navigasi bawah khusus ponsel: 5 tombol utama dengan target sentuh besar. */
export function BottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin } = useRole();
  const { canInstall, install } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const more = secondary.filter((i) => !i.adminOnly || isAdmin);
  const moreActive = more.some((i) => isActive(i.url));

  return (
    <nav
      aria-label="Navigasi utama"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {primary.map((item) => (
          <li key={item.url}>
            <Link
              to={item.url}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                isActive(item.url) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          </li>
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="Menu lainnya"
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span>Lainnya</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-base">Menu Lainnya</SheetTitle>
              </SheetHeader>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {more.map((item) => (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-[56px] items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.url) ? "border-primary/50 bg-primary/10 text-primary" : "bg-muted/20",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{item.title}</span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
