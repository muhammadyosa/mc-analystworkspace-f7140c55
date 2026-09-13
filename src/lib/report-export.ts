import * as XLSX from "xlsx";

/** Baris laporan generik: kunci = judul kolom. */
export type ExportRow = Record<string, string | number>;

const stamp = () => new Date().toISOString().slice(0, 10);

const safe = (s: string) => s.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase();

/** Unduh laporan sebagai file Excel (.xlsx). */
export function exportExcel(rows: ExportRow[], sheetName: string, fileLabel: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName.slice(0, 31) || "Report");
  XLSX.writeFile(wb, `${safe(fileLabel)}-${stamp()}.xlsx`);
}

/** Unduh laporan sebagai CSV (bisa dibuka di Excel / Google Sheets). */
export function exportCSV(rows: ExportRow[], fileLabel: string) {
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
  triggerDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${safe(fileLabel)}-${stamp()}.csv`);
}

/** Unduh data mentah laporan sebagai JSON (untuk integrasi lanjutan). */
export function exportJSON(rows: ExportRow[], fileLabel: string) {
  triggerDownload(
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    `${safe(fileLabel)}-${stamp()}.json`,
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Unduh grafik (SVG Recharts) di dalam elemen sebagai gambar PNG. */
export async function exportPNG(el: HTMLElement | null, fileLabel: string) {
  const svg = el?.querySelector("svg");
  if (!svg) throw new Error("Tidak ada grafik untuk diekspor");
  const box = svg.getBoundingClientRect();
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal memuat grafik"));
    img.src = url;
  });
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width * scale));
  canvas.height = Math.max(1, Math.round(box.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  ctx.fillStyle = bg ? `hsl(${bg})` : "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Gagal membuat PNG");
  triggerDownload(blob, `${safe(fileLabel)}-${stamp()}.png`);
}

/** Cetak / simpan PDF satu bagian halaman lewat jendela cetak browser. */
export function printSection(el: HTMLElement | null, title: string) {
  if (!el) {
    window.print();
    return;
  }
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) {
    window.print();
    return;
  }
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map((n) => n.outerHTML)
    .join("");
  win.document.write(
    `<!doctype html><html><head><title>${title}</title>${styles}` +
      `<style>body{padding:24px;background:#fff;color:#111} .no-print{display:none!important}</style>` +
      `</head><body>${el.outerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 600);
}
