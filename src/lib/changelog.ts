// Pusat catatan pembaruan aplikasi.
// Setiap kali ada fitur, menu, atau fungsi baru: tambahkan entri baru di paling atas
// dan naikkan APP_VERSION. Pengguna otomatis melihat notifikasi "Apa yang baru".

export type ChangeKind = "fitur" | "menu" | "fungsi" | "perbaikan" | "tampilan";

export type ChangelogEntry = {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  items: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.7.0",
    date: "2026-09-13",
    title: "Aplikasi Ponsel & Pemasangan di Layar Utama",
    items: [
      { kind: "menu", text: "Navigasi bawah khusus ponsel: Dashboard, Analyst, Action, Reports, dan Lainnya." },
      { kind: "fitur", text: "Aplikasi bisa dipasang di layar utama ponsel/desktop dengan ikon dan nama MCA." },
      { kind: "tampilan", text: "Dukungan area aman iPhone dan tidak ada lagi geser ke samping yang tidak perlu." },
      { kind: "perbaikan", text: "Dashboard tidak lagi gagal dimuat saat data baru selesai dimuat." },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-09-11",
    title: "Pusat Pembaruan & Optimasi Semua Perangkat",
    items: [
      { kind: "fitur", text: "Panel 'Apa yang Baru' di header — otomatis muncul saat ada fitur, menu, atau fungsi baru." },
      { kind: "fungsi", text: "Deteksi versi aplikasi baru: aplikasi memuat ulang otomatis agar selalu memakai versi terbaru." },
      { kind: "tampilan", text: "Tata letak lebih nyaman di ponsel, tablet, dan desktop; tombol lebih mudah disentuh." },
      { kind: "perbaikan", text: "Scroll dan animasi lebih ringan sehingga tidak berat saat berpindah menu." },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-09-10",
    title: "Master Cluster & Penyempurnaan Label HC Aktif",
    items: [
      { kind: "fungsi", text: "Filter per bulan pada Master Cluster beserta HC Aktif, Ticket, dan selisih per bulan." },
      { kind: "perbaikan", text: "Kolom Hasil / Outcome pada Action Plan bisa diketik dan langsung tampil." },
      { kind: "tampilan", text: "Penyeragaman label HC Aktif di seluruh menu dan tabel ringkasan cluster." },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-09-09",
    title: "Reports Harian, Mingguan, Bulanan & Competitor",
    items: [
      { kind: "menu", text: "Tab Day terpisah dengan Analisis Profiling Harian dan Ringkasan Profiling." },
      { kind: "fitur", text: "Pilihan Minggu 1–5 dan pembanding antar minggu pada Reports Weekly." },
      { kind: "fitur", text: "Filter tanggal tunggal pada Competitor Intel beserta ringkasan profiling." },
      { kind: "fungsi", text: "Export PDF dan Excel untuk laporan harian dan hasil profiling." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-08",
    title: "Visualisasi Baru & Tema Warna",
    items: [
      { kind: "tampilan", text: "Redesign chart: warna semantik, tooltip informatif, label tidak bertabrakan." },
      { kind: "fitur", text: "Mode terang/gelap plus 5 tema warna yang tersimpan otomatis." },
      { kind: "fitur", text: "Distribusi HC per Provinsi dan Threat Level memakai visual arc modern." },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-05",
    title: "Action Plan Management",
    items: [
      { kind: "menu", text: "Menu Action Plan: Kanban, Timeline, dan Kalender." },
      { kind: "fungsi", text: "Edit manual OLT / Cluster / PIC / Program serta status otomatis." },
      { kind: "fungsi", text: "Unduh kalender aksi dalam PDF dan Excel." },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-02",
    title: "Competitor Intelligence & Analyst Market",
    items: [
      { kind: "menu", text: "Menu Competitor Intelligence dan Analyst Market." },
      { kind: "fitur", text: "Semua kartu dan grafik bisa diklik untuk melihat rincian datanya." },
      { kind: "fungsi", text: "Smart Bulk Excel Import untuk beberapa file sekaligus." },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "1.0.0";

const SEEN_KEY = "mca:changelog-seen";

export function getSeenVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markSeen(version = APP_VERSION) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, version);
  } catch {
    /* storage tidak tersedia */
  }
}

export function hasUnseenUpdate(): boolean {
  const seen = getSeenVersion();
  return seen !== APP_VERSION;
}

/** Entri yang belum pernah dilihat pengguna (versi lebih baru dari yang tersimpan). */
export function unseenEntries(): ChangelogEntry[] {
  const seen = getSeenVersion();
  if (!seen) return CHANGELOG.slice(0, 1);
  const idx = CHANGELOG.findIndex((e) => e.version === seen);
  return idx <= 0 ? (idx === 0 ? [] : CHANGELOG.slice(0, 1)) : CHANGELOG.slice(0, idx);
}
