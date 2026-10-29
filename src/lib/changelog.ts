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
    version: "2.12.0",
    date: "2026-10-29",
    title: "Ranking Churn dan Competitor Profiling",
    items: [
      {
        kind: "fitur",
        text: "Master Cluster menampilkan ranking risiko dan sorting skor churn dua arah menggunakan rumus yang sama.",
      },
      {
        kind: "fitur",
        text: "Profiling kompetitor menampilkan paket, promo, instalasi, perbandingan ICONNET, serta rekomendasi dari data aktual Competitor dan Analyst Market.",
      },
      {
        kind: "fungsi",
        text: "Admin dan Manager dapat menambah atau memperbarui data kompetitor bersama, dengan perlindungan konflik pembaruan. Informasi yang belum tersedia ditandai Belum ada data.",
      },
    ],
  },
  {
    version: "2.11.0",
    date: "2026-10-23",
    title: "User Management Lebih Profesional",
    items: [
      {
        kind: "fitur",
        text: "User Management kini punya kartu statistik (Total, Aktif, Nonaktif, Total Role), pencarian, filter role dan status, sorting kolom, pagination, serta tampilan kartu ringkas di ponsel.",
      },
      {
        kind: "fitur",
        text: "Tambah pengguna lewat undangan email, edit nama, ubah role, aktif/nonaktifkan, lihat detail, dan hapus pengguna dengan konfirmasi — semua tervalidasi dan aman di sisi server.",
      },
      {
        kind: "perbaikan",
        text: "Perpindahan tab lebih cepat: data pengguna di-cache, tidak ada loading berulang, filter dan halaman tersimpan saat berpindah tab, dan request yang kedaluwarsa dibatalkan.",
      },
    ],
  },
  {
    version: "2.10.7",
    date: "2026-10-23",
    title: "Audit Keandalan dan Sinkronisasi",
    items: [
      {
        kind: "perbaikan",
        text: "Perubahan kartu Action Plan tidak lagi tertimpa oleh pembaruan data latar belakang yang lebih lama.",
      },
      {
        kind: "perbaikan",
        text: "Sinkronisasi cloud tidak memicu tampilan ulang bila tidak ada data yang berubah.",
      },
    ],
  },
  {
    version: "2.10.6",
    date: "2026-10-22",
    title: "Ikon Seragam dan Navigasi Lebih Rapi",
    items: [
      {
        kind: "tampilan",
        text: "Dashboard, Analyst, dan Reports di navigasi bawah memakai emoji yang sama dengan menu utama; semua ikon dan label sejajar.",
      },
      {
        kind: "perbaikan",
        text: "Menu diciutkan memiliki ikon terpusat tanpa terpotong, tetap bisa digulir pada layar pendek, dan tombol buka-tutup tetap nyaman ditekan.",
      },
    ],
  },
  {
    version: "2.10.5",
    date: "2026-10-22",
    title: "Tombol Menu di Semua Perangkat",
    items: [
      {
        kind: "tampilan",
        text: "Tombol toska melayang untuk menutup menu kini juga tampil di ponsel dan tablet saat laci menu terbuka, menggantikan tombol silang; buka kembali tetap lewat tombol Menu di bilah bawah.",
      },
    ],
  },
  {
    version: "2.10.4",
    date: "2026-10-22",
    title: "Tombol Menu Lebih Ramping",
    items: [
      {
        kind: "tampilan",
        text: "Tombol buka dan tutup menu dibuat lebih kecil dan rapi dengan garis tepi halus serta bayangan tipis; animasi riak diperlembut dan area klik tetap nyaman.",
      },
    ],
  },
  {
    version: "2.10.3",
    date: "2026-10-22",
    title: "Tampilan Tombol Buka dan Tutup Menu",
    items: [
      {
        kind: "tampilan",
        text: "Menu terbuka memakai tombol toska berpanah kiri; menu tertutup memakai panah kanan dengan cincin biru beranimasi lembut dan area klik yang tetap stabil.",
      },
    ],
  },
  {
    version: "2.10.2",
    date: "2026-10-22",
    title: "Tombol Menu Melayang",
    items: [
      {
        kind: "tampilan",
        text: "Tombol tutup dan buka menu melayang lembut dengan cahaya serta riak halus; animasi mengikuti preferensi Kurangi animasi.",
      },
    ],
  },
  {
    version: "2.10.1",
    date: "2026-10-22",
    title: "Ikon Menu Lebih Menarik",
    items: [
      {
        kind: "tampilan",
        text: "Menu utama memakai emoji sesuai kategori di sidebar dan drawer ponsel, dengan fungsi serta akses tetap sama.",
      },
    ],
  },
  {
    version: "2.10.0",
    date: "2026-10-22",
    title: "Profiling Terhubung Kanban",
    items: [
      {
        kind: "fitur",
        text: "Hasil Profiling dan detail cluster menampilkan status, progres, overdue, PIC, target, serta tindak lanjut kartu Kanban aktual.",
      },
      {
        kind: "perbaikan",
        text: "Perubahan Action Plan disimpan ke cloud; status manual dipertahankan dan insight diperbarui tanpa duplikasi ringkasan.",
      },
    ],
  },
  {
    version: "2.9.0",
    date: "2026-10-22",
    title: "Hasil Profiling & Sorting Master Cluster",
    items: [
      {
        kind: "fitur",
        text: "Master Cluster: tombol Lihat Detail menampilkan hasil profiling otomatis (tren HC, perubahan HC, ticket, Priority Score, potensi churn, rekomendasi retention).",
      },
      { kind: "fitur", text: "Tombol Salin Hasil Profiling untuk dibagikan ke tim." },
      {
        kind: "fungsi",
        text: "Urutkan cluster berdasarkan potensi churn, Priority Score, penurunan HC, ticket, kabupaten, PIC, atau nama, plus filter risiko Tinggi/Sedang/Rendah.",
      },
    ],
  },
  {
    version: "2.8.0",
    date: "2026-10-20",
    title: "Navigasi Mobile Baru",
    items: [
      {
        kind: "tampilan",
        text: "Bilah bawah ponsel: Dashboard, Analyst, Menu, Reports, dan Akun.",
      },
      {
        kind: "fungsi",
        text: "Tab Akun berisi profil, Pengaturan, Pasang ke Layar Utama, dan Keluar.",
      },
    ],
  },
  {
    version: "2.7.0",
    date: "2026-10-15",
    title: "Lebih Cepat & Ramah Ponsel",
    items: [
      {
        kind: "perbaikan",
        text: "Perpindahan menu lebih cepat dan impor Excel tidak membuat aplikasi macet.",
      },
      {
        kind: "tampilan",
        text: "Semua halaman, tabel, dan jendela dialog menyesuaikan ukuran layar.",
      },
    ],
  },
  {
    version: "2.6.0",
    date: "2026-10-01",
    title: "Potensi Cluster Akurat",
    items: [
      {
        kind: "perbaikan",
        text: "Potensi Cluster dihitung dari asesmen terbaru per cluster sehingga Tinggi/Sedang/Rendah sesuai data aktual.",
      },
      { kind: "tampilan", text: "Customer Loyalty dan Distribusi HC per Provinsi rapi di ponsel." },
    ],
  },
  {
    version: "2.5.0",
    date: "2026-09-25",
    title: "Bulan Baru Terbaca Otomatis",
    items: [
      {
        kind: "fungsi",
        text: "Kolom bulan baru (mis. September, Oktober) dari Excel otomatis terbaca di KPI, grafik, filter, dan laporan.",
      },
      {
        kind: "perbaikan",
        text: "Insight HC Aktif Turun dan Cluster Risiko Tinggi kembali menampilkan data.",
      },
      {
        kind: "fitur",
        text: "Action Plan bisa memilih banyak OLT; Competitor Intel punya filter rentang tanggal.",
      },
    ],
  },
  {
    version: "2.4.0",
    date: "2026-09-13",
    title: "Personalisasi Dashboard & Kenyamanan Akses",
    items: [
      {
        kind: "fitur",
        text: "Pilih sendiri bagian Dashboard yang ingin tampil di Settings → Preferensi (Widget Dashboard).",
      },
      { kind: "fitur", text: "Opsi Kurangi animasi untuk tampilan yang lebih tenang dan ringan." },
      {
        kind: "fungsi",
        text: "Tautan Lompat ke konten utama dan penanda konten untuk navigasi keyboard.",
      },
      {
        kind: "perbaikan",
        text: "Badge peran di menu akun kini menampilkan Admin, Manager, Analyst, atau Viewer sesuai izin.",
      },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-09-13",
    title: "Target & KPI Bulanan di Dashboard",
    items: [
      {
        kind: "fitur",
        text: "Kartu Target & KPI di Dashboard: bandingkan realisasi periode berjalan dengan target (pertumbuhan HC, ticket per 100 HC, cluster risiko tinggi).",
      },
      {
        kind: "fitur",
        text: "Target bisa diatur sendiri lewat tombol Atur Target dan tersimpan otomatis di perangkat.",
      },
      {
        kind: "fungsi",
        text: "Status Tercapai/Belum dan progres visual diperbarui otomatis mengikuti filter global.",
      },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-09-13",
    title: "Analyst Insight Engine, Ekspor PowerPoint & Riwayat Laporan",
    items: [
      {
        kind: "fitur",
        text: "Analyst Insight Engine: setiap temuan dilengkapi metrik pendukung, dugaan penyebab, dampak bisnis, dan rekomendasi.",
      },
      {
        kind: "fitur",
        text: "Insight bisa langsung dijadikan Action Plan dengan satu klik (Dashboard & Priority Engine).",
      },
      {
        kind: "fitur",
        text: "Ekspor laporan ke PowerPoint (.pptx) berisi slide ringkasan dan tabel data.",
      },
      {
        kind: "fungsi",
        text: "Riwayat 10 laporan terakhir tercatat di menu Ekspor Laporan lengkap dengan filter yang dipakai.",
      },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-13",
    title: "Role Manager & Analyst, Aksi Cepat Ctrl+K, Ekspor PNG",
    items: [
      {
        kind: "fitur",
        text: "Role baru Manager dan Analyst: Admin penuh, Manager kelola data & action plan, Analyst membuat action plan, Viewer hanya melihat.",
      },
      {
        kind: "fitur",
        text: "Pencarian cepat (Ctrl+K) kini punya Aksi Cepat: Upload Data, Buat Action Plan, Generate Report, Export Data — plus pencarian action plan.",
      },
      { kind: "fitur", text: "Report Center bisa mengunduh grafik sebagai gambar PNG." },
      { kind: "perbaikan", text: "Pemeriksaan role dipindah ke area internal agar lebih aman." },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-09-13",
    title: "Report Center, Insight → Action Plan & Filter Global Menyeluruh",
    items: [
      {
        kind: "fitur",
        text: "Filter global kini juga berlaku di Priority Engine, Customer Loyalty, Competitor Intelligence, dan Reports.",
      },
      {
        kind: "fitur",
        text: "Report Center: unduh laporan dalam PDF/cetak, Excel, CSV, atau JSON dari satu tombol.",
      },
      {
        kind: "fungsi",
        text: "Setiap rekomendasi di Recommendation Box bisa langsung dijadikan Action Plan dengan sekali klik.",
      },
      {
        kind: "tampilan",
        text: "Tampilan cetak lebih bersih: tombol dan menu tidak lagi ikut tercetak.",
      },
      {
        kind: "perbaikan",
        text: "Fokus keyboard selalu terlihat dan tombol lebih nyaman disentuh di ponsel.",
      },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-09-13",
    title: "Filter Global, Tampilan Tersimpan & Data Health",
    items: [
      {
        kind: "fitur",
        text: "Filter global (periode, provinsi, wilayah, cluster, PIC, kategori) yang dipakai bersama oleh kartu, grafik, dan tabel.",
      },
      {
        kind: "fitur",
        text: "Tampilan tersimpan: simpan, ganti nama, duplikat, hapus, dan tandai satu tampilan sebagai default.",
      },
      {
        kind: "menu",
        text: "Menu baru Data Health: kesegaran data, jumlah baris/kolom, duplikat, nilai kosong, dan riwayat impor.",
      },
      {
        kind: "fitur",
        text: "Notifikasi kini punya status sudah/belum dibaca, filter belum dibaca, dan pengaturan jenis peringatan.",
      },
      {
        kind: "menu",
        text: "Settings › Preferensi: mode terang/gelap/ikuti sistem, tema warna, tabel ringkas, halaman favorit.",
      },
      {
        kind: "tampilan",
        text: "Di ponsel, tabel Master Cluster dan Data Health berubah menjadi kartu yang mudah dibaca.",
      },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-09-13",
    title: "Pencarian Cepat, Smart Alert & Pasang Aplikasi",
    items: [
      {
        kind: "fitur",
        text: "Pencarian cepat di header (atau tekan Ctrl/Cmd + K) untuk melompat ke menu, cluster, atau nama PIC.",
      },
      {
        kind: "fitur",
        text: "Pusat notifikasi Smart Alert: program lewat tenggat, HC Aktif turun, dan ticket tinggi langsung terlihat.",
      },
      {
        kind: "fungsi",
        text: "Tombol 'Pasang App' muncul otomatis di perangkat yang mendukung pemasangan ke layar utama.",
      },
      {
        kind: "tampilan",
        text: "Tampilan tablet lebih lega dan semua tombol nyaman disentuh di layar sentuh.",
      },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-09-13",
    title: "Aplikasi Ponsel & Pemasangan di Layar Utama",
    items: [
      {
        kind: "menu",
        text: "Navigasi bawah khusus ponsel: Dashboard, Analyst, Action, Reports, dan Lainnya.",
      },
      {
        kind: "fitur",
        text: "Aplikasi bisa dipasang di layar utama ponsel/desktop dengan ikon dan nama MCA.",
      },
      {
        kind: "tampilan",
        text: "Dukungan area aman iPhone dan tidak ada lagi geser ke samping yang tidak perlu.",
      },
      {
        kind: "perbaikan",
        text: "Dashboard tidak lagi gagal dimuat saat data baru selesai dimuat.",
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-09-11",
    title: "Pusat Pembaruan & Optimasi Semua Perangkat",
    items: [
      {
        kind: "fitur",
        text: "Panel 'Apa yang Baru' di header — otomatis muncul saat ada fitur, menu, atau fungsi baru.",
      },
      {
        kind: "fungsi",
        text: "Deteksi versi aplikasi baru: aplikasi memuat ulang otomatis agar selalu memakai versi terbaru.",
      },
      {
        kind: "tampilan",
        text: "Tata letak lebih nyaman di ponsel, tablet, dan desktop; tombol lebih mudah disentuh.",
      },
      {
        kind: "perbaikan",
        text: "Scroll dan animasi lebih ringan sehingga tidak berat saat berpindah menu.",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-09-10",
    title: "Master Cluster & Penyempurnaan Label HC Aktif",
    items: [
      {
        kind: "fungsi",
        text: "Filter per bulan pada Master Cluster beserta HC Aktif, Ticket, dan selisih per bulan.",
      },
      {
        kind: "perbaikan",
        text: "Kolom Hasil / Outcome pada Action Plan bisa diketik dan langsung tampil.",
      },
      {
        kind: "tampilan",
        text: "Penyeragaman label HC Aktif di seluruh menu dan tabel ringkasan cluster.",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-09-09",
    title: "Reports Harian, Mingguan, Bulanan & Competitor",
    items: [
      {
        kind: "menu",
        text: "Tab Day terpisah dengan Analisis Profiling Harian dan Ringkasan Profiling.",
      },
      {
        kind: "fitur",
        text: "Pilihan Minggu 1–5 dan pembanding antar minggu pada Reports Weekly.",
      },
      {
        kind: "fitur",
        text: "Filter tanggal tunggal pada Competitor Intel beserta ringkasan profiling.",
      },
      { kind: "fungsi", text: "Export PDF dan Excel untuk laporan harian dan hasil profiling." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-08",
    title: "Visualisasi Baru & Tema Warna",
    items: [
      {
        kind: "tampilan",
        text: "Redesign chart: warna semantik, tooltip informatif, label tidak bertabrakan.",
      },
      { kind: "fitur", text: "Mode terang/gelap plus 5 tema warna yang tersimpan otomatis." },
      {
        kind: "fitur",
        text: "Distribusi HC per Provinsi dan Threat Level memakai visual arc modern.",
      },
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
