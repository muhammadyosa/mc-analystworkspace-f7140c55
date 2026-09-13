import { Download, FileSpreadsheet, FileJson, FileText, Printer } from "lucide-react";
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
import { exportCSV, exportExcel, exportJSON, exportPNG, printSection, type ExportRow } from "@/lib/report-export";

/** Report Center: satu tombol untuk ekspor PDF / Excel / CSV / JSON. */
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
  const guard = (fn: () => void) => () => {
    if (empty) {
      toast.error("Belum ada data untuk diekspor");
      return;
    }
    fn();
    toast.success("File laporan sedang diunduh");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 no-print">
          <Download className="mr-1 h-4 w-4" /> Ekspor Laporan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => printSection(printRef?.current ?? null, label)}>
          <Printer className="mr-2 h-4 w-4" /> PDF / Cetak
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={guard(() => exportExcel(rows, sheetName, label))}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={guard(() => exportCSV(rows, label))}>
          <FileText className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={guard(() => exportJSON(rows, label))}>
          <FileJson className="mr-2 h-4 w-4" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            exportPNG(printRef?.current ?? null, label)
              .then(() => toast.success("Gambar grafik sedang diunduh"))
              .catch((e: Error) => toast.error(e.message));
          }}
        >
          <Download className="mr-2 h-4 w-4" /> PNG (grafik)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
          {rows.length} baris siap diekspor
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
