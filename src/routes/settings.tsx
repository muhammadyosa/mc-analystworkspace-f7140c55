import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Database, Users, SlidersHorizontal } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { useMenuSearch } from "@/hooks/use-menu-state";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MCA Analyst Workspace" },
      {
        name: "description",
        content: "Kelola data, pengguna, dan preferensi MCA Analyst Workspace.",
      },
      { property: "og:title", content: "Settings — MCA Analyst Workspace" },
      {
        property: "og:description",
        content: "Kelola data, pengguna, dan preferensi MCA Analyst Workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings/data", label: "Data Management", icon: Database, adminOnly: false },
  { to: "/settings/users", label: "User Management", icon: Users, adminOnly: true },
  { to: "/settings/preferences", label: "Preferensi", icon: SlidersHorizontal, adminOnly: false },
] as const;

function SettingsLayout() {
  const menuSearch = useMenuSearch();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/", replace: true });
  }, [loading, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  const visible = tabs.filter((t) => !t.adminOnly || isAdmin);
  const prefetchUsers = () => {
    if (!isAdmin) return;
    void import("@/lib/admin-users").then(({ adminUsersOptions }) =>
      queryClient.prefetchQuery(adminUsersOptions),
    ).catch(() => undefined);
  };
  return (
    <>
      <AppHeader title="Settings" subtitle="Kelola data dan akses pengguna workspace" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="glass-card inline-flex flex-wrap gap-1 rounded-xl border-0 p-1">
          {visible.map((t) => {
            const active =
              pathname === t.to || (t.to === "/settings/data" && pathname === "/settings");
            return (
              <Link
                key={t.to}
                to={t.to}
                search={() => menuSearch(t.to)}
                onMouseEnter={t.to === "/settings/users" ? prefetchUsers : undefined}
                onFocus={t.to === "/settings/users" ? prefetchUsers : undefined}
                onTouchStart={t.to === "/settings/users" ? prefetchUsers : undefined}
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
