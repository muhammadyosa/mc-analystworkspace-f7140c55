import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseClusterFile, parseTicketFile } from "@/lib/excel";
import { useDataStore } from "@/lib/store";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Data Upload — MCA Workspace" }] }),
  component: UploadPage,
});

function DropZone({
  label,
  hint,
  loaded,
  onFile,
}: {
  label: string;
  hint: string;
  loaded?: number;
  onFile: (f: File) => void;
}) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
        drag ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50"
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-lg">
        {loaded ? <CheckCircle2 className="h-7 w-7 text-white" /> : <Upload className="h-7 w-7 text-white" />}
      </div>
      <div>
        <div className="font-display text-sm font-semibold">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      {loaded !== undefined && loaded > 0 && (
        <div className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
          {loaded} baris berhasil dimuat
        </div>
      )}
    </label>
  );
}

function UploadPage() {
  const { clusters, tickets, setClusters, setTickets, clearAll } = useDataStore();

  const handleCluster = async (f: File) => {
    try {
      const rows = await parseClusterFile(f);
      if (!rows.length) throw new Error("Tidak ada baris valid");
      setClusters(rows);
      toast.success(`${rows.length} cluster berhasil diimpor`);
    } catch (e) {
      toast.error(`Gagal parse file cluster: ${(e as Error).message}`);
    }
  };
  const handleTicket = async (f: File) => {
    try {
      const rows = await parseTicketFile(f);
      setTickets(rows);
      toast.success(`${rows.length} baris ticket berhasil diimpor`);
    } catch (e) {
      toast.error(`Gagal parse file ticket: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <AppHeader title="Data Upload" subtitle="Drag & drop file Excel Anda" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="glass-card border-0">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">Import Data Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <DropZone
                label="PEMBAGIAN CLUSTER SIBT.xlsx"
                hint="Kolom otomatis dideteksi: Cluster, HC Jan–Jun, Ticket, PIC, dll."
                loaded={clusters.length}
                onFile={handleCluster}
              />
              <DropZone
                label="ticket jan-jun.xlsx"
                hint="Data ticket per wilayah. Kolom bulan otomatis di-detect."
                loaded={tickets.length}
                onFile={handleTicket}
              />
            </div>
            {(clusters.length > 0 || tickets.length > 0) && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="text-sm text-muted-foreground">
                  {clusters.length} cluster · {tickets.length} baris ticket tersimpan di device (Local Storage).
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Hapus semua data yang tersimpan?")) {
                      clearAll();
                      toast.info("Semua data dihapus");
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Reset Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-display text-base">Struktur Kolom yang Dikenali</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs md:grid-cols-2">
            <div>
              <p className="font-medium">File Cluster</p>
              <p className="text-muted-foreground">
                PROV/KAB/CLUSTER, JANUARI–JUNI, Grand Total, DELTA MEI-JUNI, ticket, TOTAL HC 2026, KABUPATEN/KOTA YG BENAR,
                STATUS KETERSEDIAAN TIM SERPO/IKR, Provinsi, PIC
              </p>
            </div>
            <div>
              <p className="font-medium">File Ticket</p>
              <p className="text-muted-foreground">
                Wilayah/Cluster + kolom bulan JANUARI–JUNI. Nama kolom dicocokkan otomatis (case-insensitive).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
