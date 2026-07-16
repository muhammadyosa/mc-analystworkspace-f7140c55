import { Moon, Sun, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useDataStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import plnLogo from "@/assets/pln-iconplus.png.asset.json";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const lastUpdated = useDataStore((s) => s.lastUpdated);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger />
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
      <img
        src={plnLogo.url}
        alt="PLN Icon Plus"
        className="hidden h-8 w-auto object-contain sm:block"
      />
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
