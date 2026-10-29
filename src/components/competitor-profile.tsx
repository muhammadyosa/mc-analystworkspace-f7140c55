import { useMemo, useState } from "react";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/lib/store";
import { useRole } from "@/hooks/use-role";
import type { ClusterRow, CompetitorRow } from "@/lib/excel";
import { categorizePromo } from "@/lib/excel";
import {
  competitorProfiles,
  competitorComparison,
  money,
  type CompetitorProfile,
} from "@/lib/competitor-profiling";
import { saveCompetitorProfile } from "@/lib/competitor-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const fields = [
  ["competitor", "Nama kompetitor", "text"],
  ["serviceType", "Jenis layanan", "text"],
  ["price", "Harga paket (Rp)", "number"],
  ["speedMbps", "Kecepatan (Mbps)", "number"],
  ["promo", "Promo atau diskon", "text"],
  ["installationCost", "Biaya instalasi (Rp)", "number"],
  ["promoStart", "Mulai promo", "date"],
  ["promoEnd", "Akhir promo", "date"],
  ["iconnetPrice", "Harga paket ICONNET (Rp)", "number"],
  ["iconnetSpeedMbps", "Kecepatan ICONNET (Mbps)", "number"],
  ["iconnetInstallationCost", "Biaya instalasi ICONNET (Rp)", "number"],
  ["iconnetPromo", "Promo ICONNET", "text"],
] as const;
type FieldKey = (typeof fields)[number][0];
type Form = Record<FieldKey, string>;

export function CompetitorProfiling({ cluster }: { cluster: ClusterRow }) {
  const rows = useDataStore((s) => s.competitorData);
  const analyst = useDataStore((s) => s.analyst);
  const { canEdit } = useRole();
  const profiles = useMemo(
    () => competitorProfiles(cluster, rows, analyst),
    [cluster, rows, analyst],
  );
  const [editing, setEditing] = useState<{ form: Form; original?: CompetitorRow } | null>(null);
  const [saving, setSaving] = useState(false);
  const openForm = (row?: CompetitorProfile) => {
    const form = Object.fromEntries(
      fields.map(([key]) => [
        key,
        row?.[key] == null || (key === "price" && row.price <= 0) ? "" : String(row[key]),
      ]),
    ) as Form;
    setEditing({ form, original: row?.original });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !canEdit || saving) return;
    const { form, original } = editing;
    if (!form.competitor.trim()) {
      toast.error("Nama kompetitor wajib diisi");
      return;
    }
    if (form.promoStart && form.promoEnd && form.promoEnd < form.promoStart) {
      toast.error("Tanggal akhir promo harus setelah tanggal mulai");
      return;
    }
    if (
      fields.some(
        ([key, , type]) =>
          type === "number" &&
          form[key] !== "" &&
          (!Number.isFinite(Number(form[key])) ||
            Number(form[key]) < 0 ||
            Number(form[key]) > 1000000000),
      )
    ) {
      toast.error("Harga dan kecepatan harus berupa angka positif atau nol");
      return;
    }
    const values = Object.fromEntries(
      fields.map(([key, , type]) => [
        key,
        type === "number" ? (form[key] === "" ? null : Number(form[key])) : form[key].trim(),
      ]),
    );
    const profile: CompetitorRow = {
      ...original,
      ...values,
      id: original?.id ?? crypto.randomUUID(),
      cluster: original?.cluster ?? cluster.cluster,
      kabupaten: original?.kabupaten ?? cluster.kabupaten,
      provinsi: original?.provinsi ?? cluster.provinsi,
      competitor: form.competitor.trim(),
      competitorRaw: form.competitor.trim(),
      price: form.price === "" ? 0 : Number(form.price),
      promo: form.promo.trim(),
      promoCategory: categorizePromo(form.promo),
    };
    setSaving(true);
    try {
      await saveCompetitorProfile(profile, original);
      toast.success("Data kompetitor diperbarui");
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data kompetitor");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      aria-label="Competitor Profiling"
      className="min-w-0 space-y-3 border-y border-border py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold">Competitor Profiling</h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => openForm()}>
            <Plus className="mr-1 size-4" />
            Tambah Kompetitor
          </Button>
        )}
      </div>
      {!profiles.length && <p className="text-sm text-muted-foreground">Belum ada data</p>}
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        {profiles.map((row) => {
          const comparison = competitorComparison(row);
          return (
            <article key={row.id} className="min-w-0 space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="break-words font-semibold">{row.competitor}</h4>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {row.source} · {row.scope}
                  </Badge>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit kompetitor ${row.competitor}`}
                    onClick={() => openForm(row)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Jenis layanan", row.serviceType || "Belum ada data"],
                  ["Harga paket", money(row.price > 0 ? row.price : null)],
                  ["Kecepatan", row.speedMbps ? `${row.speedMbps} Mbps` : "Belum ada data"],
                  ["Biaya instalasi", money(row.installationCost)],
                  ["Promo / diskon", row.promo || "Belum ada data"],
                  [
                    "Periode promo",
                    row.promoStart || row.promoEnd
                      ? `${row.promoStart || "Belum ada data"} — ${row.promoEnd || "Belum ada data"}`
                      : "Belum ada data",
                  ],
                  ["Harga ICONNET", money(row.iconnetPrice)],
                  [
                    "Kecepatan ICONNET",
                    row.iconnetSpeedMbps ? `${row.iconnetSpeedMbps} Mbps` : "Belum ada data",
                  ],
                  ["Instalasi ICONNET", money(row.iconnetInstallationCost)],
                  ["Promo ICONNET", row.iconnetPromo || "Belum ada data"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2 border-t border-border pt-3 text-xs">
                <p className="font-semibold">Insight & strategi retention</p>
                <ul className="list-disc space-y-1 break-words pl-4 text-muted-foreground">
                  {[...comparison.insights, ...comparison.advice].map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
              {row.updatedAt && (
                <p className="text-[10px] text-muted-foreground">
                  Diperbarui {new Date(row.updatedAt).toLocaleString("id-ID")}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !saving) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.original ? "Edit Kompetitor" : "Tambah Kompetitor"}</DialogTitle>
            <DialogDescription className="break-words">{cluster.cluster}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map(([key, label, type]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`competitor-${key}`}>{label}</Label>
                    <Input
                      id={`competitor-${key}`}
                      type={type}
                      min={type === "number" ? 0 : undefined}
                      max={type === "number" ? 1000000000 : undefined}
                      step={type === "number" ? "any" : undefined}
                      required={key === "competitor"}
                      value={editing.form[key]}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, [key]: event.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan Kompetitor
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
