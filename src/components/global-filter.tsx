import { useState } from "react";
import {
  Filter,
  X,
  Bookmark,
  BookmarkPlus,
  Star,
  Copy,
  Pencil,
  Trash2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MONTH_LABELS,
  filterSummary,
  isFilterActive,
  usePrefsStore,
  type MonthKey,
} from "@/lib/prefs";
import { useGlobalClusters } from "@/hooks/use-global-filters";
import { toast } from "sonner";

const KATEGORI = [
  { value: "all", label: "Semua Kategori" },
  { value: "growth", label: "Cluster Tumbuh" },
  { value: "decline", label: "Cluster Turun" },
  { value: "high-ticket", label: "Ticket Tinggi" },
  { value: "high-risk", label: "Risiko Tinggi" },
] as const;

/** Filter global: periode, wilayah, provinsi, cluster, PIC, kategori + saved views.
 *  `hideMonths` dipakai halaman yang punya pemilih bulan/tanggal sendiri. */
export function GlobalFilterBar({ hideMonths = false }: { hideMonths?: boolean }) {
  const filters = usePrefsStore((s) => s.filters);
  const setFilter = usePrefsStore((s) => s.setFilter);
  const setFilters = usePrefsStore((s) => s.setFilters);
  const clearFilters = usePrefsStore((s) => s.clearFilters);
  const views = usePrefsStore((s) => s.views);
  const recent = usePrefsStore((s) => s.recent);
  const saveView = usePrefsStore((s) => s.saveView);
  const applyView = usePrefsStore((s) => s.applyView);
  const renameView = usePrefsStore((s) => s.renameView);
  const duplicateView = usePrefsStore((s) => s.duplicateView);
  const deleteView = usePrefsStore((s) => s.deleteView);
  const defaultViewId = usePrefsStore((s) => s.defaultViewId);
  const setDefaultView = usePrefsStore((s) => s.setDefaultView);

  const { options, rows, all, curLabel, prevLabel } = useGlobalClusters();
  const [name, setName] = useState("");
  const active = isFilterActive(filters);

  return (
    <Card className="glass-card border-0 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter Global
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {rows.length} / {all.length} cluster
        </Badge>
        {!hideMonths && (
          <Badge variant="outline" className="text-[10px]">
            {prevLabel} → {curLabel}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Bookmark className="mr-1 h-4 w-4" /> Views
                {views.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({views.length})</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              {views.length === 0 && (
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  Belum ada view tersimpan. Atur filter lalu simpan.
                </div>
              )}
              {views.map((v) => (
                <div key={v.id} className="flex items-center gap-1 px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => applyView(v.id)}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="block truncate font-medium">
                      {v.name}
                      {defaultViewId === v.id && " ★"}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {filterSummary(v.filters)}
                    </span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Jadikan default"
                    onClick={() => setDefaultView(defaultViewId === v.id ? null : v.id)}
                  >
                    <Star
                      className={
                        defaultViewId === v.id
                          ? "h-3.5 w-3.5 fill-primary text-primary"
                          : "h-3.5 w-3.5"
                      }
                    />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Ganti nama"
                    onClick={() => {
                      const next = window.prompt("Nama view", v.name);
                      if (next) renameView(v.id, next);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Duplikat"
                    onClick={() => duplicateView(v.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    aria-label="Hapus"
                    onClick={() => deleteView(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <DropdownMenuSeparator />
              <div className="flex items-center gap-2 p-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama view baru…"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    saveView(name);
                    setName("");
                    toast.success("View disimpan");
                  }}
                >
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
              </div>
              {recent.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-1 text-xs">
                    <History className="h-3 w-3" /> Filter terakhir dipakai
                  </DropdownMenuLabel>
                  {recent.map((r, i) => (
                    <DropdownMenuItem key={i} onSelect={() => setFilters(r)} className="text-xs">
                      {filterSummary(r)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {active && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {!hideMonths && (
          <>
            <FilterSelect
              label="Dari bulan"
              value={filters.monthFrom}
              onChange={(v) => setFilter("monthFrom", v as MonthKey | "auto")}
              autoLabel="Otomatis"
              items={options.months.map((m) => ({ value: m, label: MONTH_LABELS[m] }))}
            />
            <FilterSelect
              label="Sampai bulan"
              value={filters.monthTo}
              onChange={(v) => setFilter("monthTo", v as MonthKey | "auto")}
              autoLabel="Otomatis"
              items={options.months.map((m) => ({ value: m, label: MONTH_LABELS[m] }))}
            />
          </>
        )}

        <FilterSelect
          label="Provinsi"
          value={filters.provinsi}
          onChange={(v) => {
            setFilter("provinsi", v);
            setFilter("kabupaten", "all");
            setFilter("cluster", "all");
          }}
          autoLabel="Semua Provinsi"
          autoValue="all"
          items={options.provinsi.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          label="Wilayah / Kabupaten"
          value={filters.kabupaten}
          onChange={(v) => {
            setFilter("kabupaten", v);
            setFilter("cluster", "all");
          }}
          autoLabel="Semua Wilayah"
          autoValue="all"
          items={options.kabupaten.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          label="Cluster"
          value={filters.cluster}
          onChange={(v) => setFilter("cluster", v)}
          autoLabel="Semua Cluster"
          autoValue="all"
          items={options.cluster.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          label="PIC"
          value={filters.pic}
          onChange={(v) => setFilter("pic", v)}
          autoLabel="Semua PIC"
          autoValue="all"
          items={options.pic.map((p) => ({ value: p, label: p }))}
        />
        <div className="col-span-2 md:col-span-1">
          <FilterSelect
            label="Kategori"
            value={filters.kategori}
            onChange={(v) => setFilter("kategori", v as typeof filters.kategori)}
            autoLabel="Semua Kategori"
            autoValue="all"
            items={KATEGORI.filter((k) => k.value !== "all").map((k) => ({
              value: k.value,
              label: k.label,
            }))}
          />
        </div>
      </div>
      {active && (
        <p className="mt-2 text-[11px] text-muted-foreground">Aktif: {filterSummary(filters)}</p>
      )}
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
  autoLabel,
  autoValue = "auto",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
  autoLabel: string;
  autoValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder={autoLabel} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={autoValue}>{autoLabel}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
