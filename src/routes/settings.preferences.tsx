import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Bell, Palette, Star, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, type ColorTheme, type ThemeMode } from "@/hooks/use-theme";
import { DASHBOARD_WIDGETS, defaultWidgets, filterSummary, usePrefsStore } from "@/lib/prefs";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/preferences")({
  head: () => ({
    meta: [
      { title: "Preferensi — MCA Analyst Workspace" },
      {
        name: "description",
        content: "Atur tampilan, notifikasi, dan tampilan tersimpan workspace.",
      },
      { property: "og:title", content: "Preferensi — MCA Analyst Workspace" },
      {
        property: "og:description",
        content: "Atur tampilan, notifikasi, dan tampilan tersimpan workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreferencesPage,
});

const PAGES = [
  { url: "/", label: "Dashboard" },
  { url: "/master", label: "Master Cluster" },
  { url: "/analyst", label: "Analyst Market" },
  { url: "/priority", label: "Priority Engine" },
  { url: "/action-plan", label: "Action Plan" },
  { url: "/loyalty", label: "Customer Loyalty" },
  { url: "/competitor-intel", label: "Competitor Intelligence" },
  { url: "/reports", label: "Reports" },
];

const COLORS: { id: ColorTheme; label: string }[] = [
  { id: "slate", label: "Slate Professional" },
  { id: "cyber", label: "Cyber Ocean" },
  { id: "emerald", label: "Emerald Forest" },
  { id: "amethyst", label: "Royal Amethyst" },
  { id: "crimson", label: "Charcoal Crimson" },
];

const NOTIF: { key: "kritis" | "perhatian" | "info" | "sistem"; label: string; desc: string }[] = [
  { key: "kritis", label: "Critical", desc: "Program lewat tenggat dan risiko tinggi" },
  { key: "perhatian", label: "Warning", desc: "HC Aktif turun, ticket tinggi" },
  { key: "info", label: "Information", desc: "Data belum lengkap, saran perbaikan" },
  { key: "sistem", label: "System", desc: "Kesegaran data dan status unggahan" },
];

function PreferencesPage() {
  const { mode, colorTheme, setMode, setColorTheme } = useTheme();
  const prefs = usePrefsStore();
  const widgets = { ...defaultWidgets, ...(prefs.widgets ?? {}) };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Palette className="h-4 w-4 text-primary" /> Tampilan
          </CardTitle>
          <CardDescription>Mode terang, gelap, atau mengikuti sistem perangkat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Mode tema</span>
            <Select value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Terang</SelectItem>
                <SelectItem value="dark">Gelap</SelectItem>
                <SelectItem value="system">Ikuti sistem</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Tema warna</span>
            <Select value={colorTheme} onValueChange={(v) => setColorTheme(v as ColorTheme)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Tampilan tabel ringkas</p>
              <p className="text-xs text-muted-foreground">Baris lebih padat untuk data banyak.</p>
            </div>
            <Switch
              checked={prefs.density === "compact"}
              onCheckedChange={(v) => prefs.setDensity(v ? "compact" : "comfortable")}
              aria-label="Tampilan tabel ringkas"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Kurangi animasi</p>
              <p className="text-xs text-muted-foreground">
                Nonaktifkan transisi agar lebih nyaman & ringan.
              </p>
            </div>
            <Switch
              checked={prefs.reduceMotion}
              onCheckedChange={(v) => prefs.setReduceMotion(v)}
              aria-label="Kurangi animasi"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <LayoutGrid className="h-4 w-4 text-primary" /> Widget Dashboard
          </CardTitle>
          <CardDescription>Pilih bagian yang ingin ditampilkan di Dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DASHBOARD_WIDGETS.map((wg) => (
            <div
              key={wg.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <p className="min-w-0 truncate text-sm font-medium">{wg.label}</p>
              <Switch
                checked={widgets[wg.id]}
                onCheckedChange={(v) => prefs.toggleWidget(wg.id, v)}
                aria-label={wg.label}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              prefs.resetWidgets();
              toast.success("Widget Dashboard dikembalikan ke bawaan");
            }}
          >
            Tampilkan semua widget
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Bell className="h-4 w-4 text-primary" /> Notifikasi
          </CardTitle>
          <CardDescription>
            Pilih jenis peringatan yang muncul di lonceng notifikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {NOTIF.map((n) => (
            <div
              key={n.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.label}</p>
                <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch
                checked={prefs.notifPrefs[n.key]}
                onCheckedChange={(v) => prefs.setNotifPref(n.key, v)}
                aria-label={n.label}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Bookmark className="h-4 w-4 text-primary" /> Saved Views & Filter Default
          </CardTitle>
          <CardDescription>View default otomatis dipakai saat aplikasi dibuka.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {prefs.views.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada view. Atur filter global di Dashboard lalu simpan sebagai view.
            </p>
          )}
          {prefs.views.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.name}</p>
                <p className="truncate text-xs text-muted-foreground">{filterSummary(v.filters)}</p>
              </div>
              {prefs.defaultViewId === v.id && (
                <Badge variant="secondary" className="text-[10px]">
                  Default
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  prefs.setDefaultView(prefs.defaultViewId === v.id ? null : v.id);
                  toast.success("Preferensi disimpan");
                }}
              >
                <Star
                  className={
                    prefs.defaultViewId === v.id ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"
                  }
                />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={prefs.clearFilters}>
            Reset filter aktif
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <LayoutGrid className="h-4 w-4 text-primary" /> Halaman Favorit
          </CardTitle>
          <CardDescription>Halaman favorit tampil di bagian atas menu samping.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {PAGES.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => prefs.toggleFavorite(p.url)}
              aria-pressed={prefs.favorites.includes(p.url)}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                prefs.favorites.includes(p.url)
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <span className="truncate">{p.label}</span>
              <Star
                className={
                  prefs.favorites.includes(p.url) ? "h-4 w-4 fill-primary" : "h-4 w-4 opacity-40"
                }
              />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
