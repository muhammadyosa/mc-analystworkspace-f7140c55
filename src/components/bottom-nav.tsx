import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, UserSearch, Menu, FileText, UserRound, LogOut, ShieldCheck, Settings, Download } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useInstallPrompt } from "@/components/install-app";
import { workspaceUserOptions } from "@/lib/workspace-user";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const itemCls =
  "relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors";

function ActiveDot({ on }: { on: boolean }) {
  return on ? <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" /> : null;
}

/** Navigasi bawah khusus ponsel: Dashboard, Analyst, Menu (drawer utama), Reports, Akun. */
export function BottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { openMobile, setOpenMobile } = useSidebar();
  const { canInstall, install } = useInstallPrompt();
  const { data: identity } = useQuery(workspaceUserOptions);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const mainActive = !["/", "/analyst", "/reports"].some(isActive) || openMobile;

  const md = identity?.user.user_metadata ?? {};
  const email = identity?.user.email ?? null;
  const name: string | null = md.full_name ?? md.name ?? email;
  const avatar: string | null = md.avatar_url ?? md.picture ?? null;
  const role = identity?.role;
  const initials = (name ?? email ?? "U").slice(0, 2).toUpperCase();

  async function signOut() {
    setAccountOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  }

  const link = (to: string, title: string, Icon: typeof Menu) => (
    <li>
      <Link
        to={to}
        aria-current={isActive(to) ? "page" : undefined}
        className={cn(itemCls, isActive(to) && !openMobile ? "text-primary" : "text-muted-foreground")}
      >
        <ActiveDot on={isActive(to) && !openMobile} />
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{title}</span>
      </Link>
    </li>
  );

  return (
    <nav
      aria-label="Navigasi utama"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {link("/", "Dashboard", LayoutDashboard)}
        {link("/analyst", "Analyst", UserSearch)}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(!openMobile)}
            aria-label="Buka menu navigasi"
            aria-expanded={openMobile}
            className={cn(itemCls, mainActive ? "text-primary" : "text-muted-foreground")}
          >
            <ActiveDot on={mainActive} />
            <span className={cn("grid h-8 w-8 place-items-center rounded-xl", mainActive ? "bg-primary/15" : "bg-muted/50")}>
              <Menu className="h-5 w-5 shrink-0" />
            </span>
            <span>Menu</span>
          </button>
        </li>
        {link("/reports", "Reports", FileText)}
        <li>
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-label="Akun"
            className={cn(itemCls, accountOpen ? "text-primary" : "text-muted-foreground")}
          >
            <ActiveDot on={accountOpen} />
            <UserRound className="h-5 w-5 shrink-0" />
            <span>Akun</span>
          </button>
        </li>
      </ul>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-base">Akun</SheetTitle>
          </SheetHeader>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/60">
              {avatar && <AvatarImage src={avatar} alt={name ?? "User"} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name ?? "Pengguna"}</div>
              <div className="truncate text-xs text-muted-foreground">{email}</div>
            </div>
            {role && (
              <Badge variant={role === "admin" ? "default" : "secondary"} className="shrink-0 gap-1">
                {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                {role === "admin" ? "Admin" : role === "manager" ? "Manager" : role === "analyst" ? "Analyst" : "Viewer"}
              </Badge>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {role === "admin" && (
              <Link
                to="/settings"
                onClick={() => setAccountOpen(false)}
                className="flex min-h-[48px] items-center gap-3 rounded-xl border border-border/60 px-3 text-sm font-medium"
              >
                <Settings className="h-4 w-4 shrink-0" /> Pengaturan
              </Link>
            )}
            {canInstall && (
              <button
                type="button"
                onClick={() => { void install(); setAccountOpen(false); }}
                className="flex min-h-[48px] items-center gap-3 rounded-xl border border-border/60 px-3 text-left text-sm font-medium"
              >
                <Download className="h-4 w-4 shrink-0" /> Pasang ke Layar Utama
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-destructive/30 px-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" /> Keluar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
