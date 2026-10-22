import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Printer,
  Presentation,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportCSV,
  exportExcel,
  exportJSON,
  exportPNG,
  exportPPTX,
  printSection,
  type ExportRow,
} from "@/lib/report-export";
import { filterSummary, usePrefsStore } from "@/lib/prefs";

/** Report Center: satu tombol untuk ekspor PDF / Excel / CSV / JSON / PNG / PowerPoint. */
export function ReportExportMenu({
  rows,
  label,
  sheetName = "Report",
  printRef,
}: {
  rows: ExportRow[];
  label: string;
  sheetName?: string;
  printRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const empty = rows.length === 0;
  const filters = usePrefsStore((s) => s.filters);
  const addReport = usePrefsStore((s) => s.addReport);
  const recentReports = usePrefsStore((s) => s.recentReports);

  const record = (format: string) =>
    addReport({ label, format, rows: rows.length, filters: filterSummary(filters) });

  const guard = (format: string, fn: () => void) => () => {
    if (empty) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    fn();
    record(format);
    toast.success(`Laporan ${format} sedang diunduh`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 no-print">
          <Download className="mr-1 h-4 w-4" /> Ekspor Laporan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => {
            printSection(printRef?.current ?? null, label);
            record("PDF");
          }}
        >
          <Printer className="mr-2 h-4 w-4" /> PDF / Cetak
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={guard("Excel", () => exportExcel(rows, sheetName, label))}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={guard("CSV", () => exportCSV(rows, label))}>
          <FileText className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={guard("JSON", () => exportJSON(rows, label))}>
          <FileJson className="mr-2 h-4 w-4" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (empty) {
              toast.error("Belum ada data untuk diekspor");
              return;
            }
            toast.info("Menyiapkan presentasi PowerPoint…");
            exportPPTX(rows, label, filterSummary(filters))
              .then(() => {
                record("PowerPoint");
                toast.success("Presentasi PowerPoint sedang diunduh");
              })
              .catch(() => toast.error("Gagal membuat presentasi"));
          }}
        >
          <Presentation className="mr-2 h-4 w-4" /> PowerPoint (.pptx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            exportPNG(printRef?.current ?? null, label)
              .then(() => {
                record("PNG");
                toast.success("Gambar grafik sedang diunduh");
              })
              .catch((e: Error) => toast.error(e.message));
          }}
        >
          <ImageIcon className="mr-2 h-4 w-4" /> PNG (grafik)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
          {rows.length} baris siap diekspor · {filterSummary(filters)}
        </DropdownMenuLabel>
        {recentReports.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" /> Laporan Terbaru
            </DropdownMenuLabel>
            {recentReports.slice(0, 5).map((r) => (
              <div key={r.id} className="px-2 py-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{r.format}</span> — {r.label} ·{" "}
                {r.rows} baris ·{" "}
                {new Date(r.at).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
