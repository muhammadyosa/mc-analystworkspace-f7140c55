import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Database, Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MCA Workspace" }] }),
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings/data", label: "Data Management", icon: Database },
  { to: "/settings/users", label: "User Management", icon: Users },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <>
      <AppHeader title="Settings" subtitle="Kelola data dan akses pengguna workspace" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="glass-card inline-flex flex-wrap gap-1 rounded-xl border-0 p-1">
          {tabs.map((t) => {
            const active = pathname === t.to || (t.to === "/settings/data" && pathname === "/settings");
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </>
  );
}
