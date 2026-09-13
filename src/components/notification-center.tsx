import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, TrendingDown, Ticket, UploadCloud, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  level: "kritis" | "perhatian" | "info";
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  to: "/action-plan" | "/loyalty" | "/priority" | "/settings";
};

/** Pusat notifikasi: peringatan otomatis dari data terbaru (tanpa mengubah data). */
export function NotificationCenter() {
  const clusters = useDataStore((s) => s.clusters);
  const actionPlans = useDataStore((s) => s.actionPlans);

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];

    const overdue = actionPlans.filter((a) => a.status === "overdue");
    if (overdue.length > 0) {
      list.push({
        id: "overdue",
        level: "kritis",
        icon: AlertTriangle,
        title: `${overdue.length} program melewati tenggat`,
        detail: overdue
          .slice(0, 3)
          .map((a) => `${a.cluster} — ${a.program}`)
          .join(", "),
        to: "/action-plan",
      });
    }

    const turun = clusters.filter((c) => c.deltaMeiJuni < 0);
    if (turun.length > 0) {
      const worst = [...turun].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 3);
      list.push({
        id: "hc-turun",
        level: "perhatian",
        icon: TrendingDown,
        title: `${turun.length} cluster mengalami penurunan HC Aktif`,
        detail: worst.map((c) => `${c.cluster} (${c.deltaMeiJuni})`).join(", "),
        to: "/loyalty",
      });
    }

    const highTicket = clusters.filter((c) => c.ticket >= 100);
    if (highTicket.length > 0) {
      const top = [...highTicket].sort((a, b) => b.ticket - a.ticket).slice(0, 3);
      list.push({
        id: "ticket",
        level: "perhatian",
        icon: Ticket,
        title: `${highTicket.length} cluster dengan ticket tinggi`,
        detail: top.map((c) => `${c.cluster} (${c.ticket})`).join(", "),
        to: "/priority",
      });
    }

    if (clusters.length === 0) {
      list.push({
        id: "no-data",
        level: "info",
        icon: UploadCloud,
        title: "Belum ada data cluster",
        detail: "Unggah file di Settings › Data Management agar semua menu terisi.",
        to: "/settings",
      });
    }

    return list;
  }, [clusters, actionPlans]);

  const critical = alerts.filter((a) => a.level === "kritis").length;
  const count = alerts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifikasi (${count})`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-primary-foreground",
                critical > 0 ? "bg-destructive" : "bg-primary",
              )}
            >
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <span className="font-display text-sm font-semibold">Smart Alert</span>
          <Badge variant="secondary" className="text-[10px]">{count} peringatan</Badge>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Semua indikator dalam kondisi baik.
            </div>
          ) : (
            alerts.map((a) => (
              <Link
                key={a.id}
                to={a.to}
                className="flex items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors last:border-0 hover:bg-muted/40"
              >
                <a.icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    a.level === "kritis"
                      ? "text-destructive"
                      : a.level === "perhatian"
                        ? "text-amber-500"
                        : "text-primary",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{a.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.detail}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
