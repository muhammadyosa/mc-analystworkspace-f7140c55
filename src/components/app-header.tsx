import { RefreshCw, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { WhatsNew } from "@/components/whats-new";
import { CommandCenter } from "@/components/command-center";
import { NotificationCenter } from "@/components/notification-center";
import { InstallApp } from "@/components/install-app";
import { useDataStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceUserOptions } from "@/lib/workspace-user";
import { toast } from "sonner";
import plnLogo from "@/assets/pln-iconplus.png.asset.json";
import danantaraLight from "@/assets/danantara-light.png.asset.json";
import danantaraDark from "@/assets/danantara-dark.svg.asset.json";

type UserInfo = {
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: "admin" | "manager" | "analyst" | "viewer";
};

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  const lastUpdated = useDataStore((s) => s.lastUpdated);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: identity } = useQuery(workspaceUserOptions);
  const md = identity?.user.user_metadata ?? {};
  const user: UserInfo | null = identity
    ? {
        email: identity.user.email ?? null,
        name: md.full_name ?? md.name ?? identity.user.email ?? null,
        avatar: md.avatar_url ?? md.picture ?? null,
        role: identity.role,
      }
    : null;

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/95 px-3 sm:gap-3 sm:px-4">
      <img
        src={theme === "dark" ? danantaraDark.url : danantaraLight.url}
        alt="Danantara Indonesia"
        className="hidden h-7 w-auto object-contain sm:block"
      />
      <img
        src={plnLogo.url}
        alt="PLN Icon Plus"
        className="hidden h-8 w-auto object-contain sm:block"
      />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {lastUpdated && (
        <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground lg:flex">
          <RefreshCw className="h-3 w-3" />
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <CommandCenter />
        <NotificationCenter />
        <InstallApp className="hidden md:inline-flex" />
        <WhatsNew />
        {user && (
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Akun"
                  className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Avatar className="h-9 w-9 ring-1 ring-border/60 hover:ring-primary/60">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.name ?? "User"} />}
                    <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <Avatar className="h-10 w-10 ring-1 ring-border/60">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.name ?? "User"} />}
                    <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold leading-tight">
                      {user.name ?? "Pengguna"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="px-3 py-2">
                  {user.role === "admin" ? (
                    <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <UserRound className="h-3 w-3" />
                      {user.role === "manager"
                        ? "Manager"
                        : user.role === "analyst"
                          ? "Analyst"
                          : "Viewer"}
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator className="m-0" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
