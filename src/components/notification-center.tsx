import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  Ticket,
  UploadCloud,
  CheckCircle2,
  Settings2,
  ServerCog,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/lib/store";
import { usePrefsStore } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type Level = "kritis" | "perhatian" | "info" | "sistem";
type Alert = {
  id: string;
  level: Level;
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  to: "/action-plan" | "/loyalty" | "/priority" | "/settings" | "/settings/data";
};

const LEVEL_LABEL: Record<Level, string> = {
  kritis: "Critical",
  perhatian: "Warning",
  info: "Information",
  sistem: "System",
};

/** Pusat notifikasi: peringatan otomatis dari data terbaru, dengan status dibaca/belum. */
export function NotificationCenter() {
  const clusters = useDataStore((s) => s.clusters);
  const actionPlans = useDataStore((s) => s.actionPlans);
  const lastUpdated = useDataStore((s) => s.lastUpdated);
  const readAlerts = usePrefsStore((s) => s.readAlerts);
  const markRead = usePrefsStore((s) => s.markRead);
  const markAllRead = usePrefsStore((s) => s.markAllRead);
  const notifPrefs = usePrefsStore((s) => s.notifPrefs);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];

    const overdue = actionPlans.filter((a) => a.status === "overdue");
    if (overdue.length > 0) {
      list.push({
        id: `overdue-${overdue.length}`,
        level: "kritis",
        icon: AlertTriangle,
        title: `${overdue.length} program melewati tenggat`,
        detail: overdue.slice(0, 3).map((a) => `${a.cluster} — ${a.program}`).join(", "),
        to: "/action-plan",
      });
    }

    const turun = clusters.filter((c) => c.deltaMeiJuni < 0);
    if (turun.length > 0) {
      const worst = [...turun].sort((a, b) => a.deltaMeiJuni - b.deltaMeiJuni).slice(0, 3);
      list.push({
        id: `hc-turun-${turun.length}`,
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
        id: `ticket-${highTicket.length}`,
        level: "perhatian",
        icon: Ticket,
        title: `${highTicket.length} cluster dengan ticket tinggi`,
        detail: top.map((c) => `${c.cluster} (${c.ticket})`).join(", "),
        to: "/priority",
      });
    }

    const missingPic = clusters.filter((c) => !c.pic).length;
    if (missingPic > 0) {
      list.push({
        id: `pic-kosong-${missingPic}`,
        level: "info",
        icon: Settings2,
        title: `${missingPic} cluster belum punya PIC`,
        detail: "Lengkapi penugasan PIC agar analisa wilayah akurat.",
        to: "/settings/data",
      });
    }

    if (lastUpdated && Date.now() - lastUpdated > 7 * 24 * 3600 * 1000) {
      list.push({
        id: `stale-${new Date(lastUpdated).toDateString()}`,
        level: "sistem",
        icon: ServerCog,
        title: "Data belum diperbarui lebih dari 7 hari",
        detail: "Periksa Data Health dan unggah data terbaru.",
        to: "/settings/data",
      });
    }

    if (clusters.length === 0) {
      list.push({
        id: "no-data",
        level: "sistem",
        icon: UploadCloud,
        title: "Belum ada data cluster",
        detail: "Unggah file di Settings › Data Management agar semua menu terisi.",
        to: "/settings",
      });
    }

    return list.filter((a) => notifPrefs[a.level]);
  }, [clusters, actionPlans, lastUpdated, notifPrefs]);

  const unread = alerts.filter((a) => !readAlerts.includes(a.id));
  const visible = onlyUnread ? unread : alerts;
  const critical = unread.filter((a) => a.level === "kritis").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifikasi, ${unread.length} belum dibaca`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-primary-foreground",
                critical > 0 ? "bg-destructive" : "bg-primary",
              )}
            >
              {unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(23rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
          <span className="font-display text-sm font-semibold">Notification Center</span>
          <Badge variant="secondary" className="text-[10px]">{unread.length} belum dibaca</Badge>
        </div>
        <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
          <Button size="sm" variant={onlyUnread ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setOnlyUnread((v) => !v)}>
            Belum dibaca
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => markAllRead(alerts.map((a) => a.id))}
          >
            Tandai semua dibaca
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Semua indikator dalam kondisi baik.
            </div>
          ) : (
            visible.map((a) => {
              const isRead = readAlerts.includes(a.id);
              return (
                <Link
                  key={a.id}
                  to={a.to}
                  onClick={() => markRead(a.id)}
                  className={cn(
                    "flex items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors last:border-0 hover:bg-muted/40",
                    isRead && "opacity-60",
                  )}
                >
                  <a.icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      a.level === "kritis"
                        ? "text-destructive"
                        : a.level === "perhatian"
                          ? "text-amber-500"
                          : a.level === "info"
                            ? "text-primary"
                            : "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {LEVEL_LABEL[a.level]}
                      </span>
                      {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-sm font-medium leading-snug">{a.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
