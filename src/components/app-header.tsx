import { RefreshCw, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import plnLogo from "@/assets/pln-iconplus.png.asset.json";
import danantaraLight from "@/assets/danantara-light.png.asset.json";
import danantaraDark from "@/assets/danantara-dark.svg.asset.json";

type UserInfo = {
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: "admin" | "user";
};

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  const lastUpdated = useDataStore((s) => s.lastUpdated);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return setUser(null);
      const md = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: u.id,
        _role: "admin",
      });
      setUser({
        email: u.email ?? null,
        name: md.full_name ?? md.name ?? u.email ?? null,
        avatar: md.avatar_url ?? md.picture ?? null,
        role: isAdmin ? "admin" : "user",
      });
    })();
  }, []);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  }

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
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
      <CommandCenter />
      <NotificationCenter />
      <InstallApp />
      <WhatsNew />
      {user && (
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
                  <UserRound className="h-3 w-3" /> User
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
      )}
    </header>
  );
}


