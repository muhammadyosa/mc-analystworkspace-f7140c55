import { Moon, Sun, RefreshCw, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/use-theme";
import { useDataStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import plnLogo from "@/assets/pln-iconplus.png.asset.json";
import danantaraLight from "@/assets/danantara-light.png.asset.json";
import danantaraDark from "@/assets/danantara-dark.svg.asset.json";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const lastUpdated = useDataStore((s) => s.lastUpdated);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<{ email: string | null; name: string | null; avatar: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return setUser(null);
      const md = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      setUser({
        email: u.email ?? null,
        name: md.full_name ?? md.name ?? u.email ?? null,
        avatar: md.avatar_url ?? md.picture ?? null,
      });
    });
  }, []);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger />
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
        <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground sm:flex">
          <RefreshCw className="h-3 w-3" />
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </div>
      )}
      {user && (
        <Avatar className="h-8 w-8 ring-1 ring-border/60" title={user.email ?? undefined}>
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name ?? "User"} />}
          <AvatarFallback className="text-[11px]">
            {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Keluar">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}

