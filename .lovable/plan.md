# Analisis Harian pada Weekly Report

## Tujuan
Menambahkan rentang tanggal harian pada tab Weekly agar hasil profiling dapat dianalisis untuk setiap tanggal yang tersedia di file, bukan hanya ditampilkan sebagai daftar.

## Perubahan
- Gunakan pemilih tanggal mulai dan akhir khusus Weekly dengan format tanggal Indonesia.
- Kelompokkan data profiling berdasarkan tanggal dalam rentang pilihan.
- Tampilkan KPI harian: total profiling, AE aktif, cluster tercakup, SF, dan Close Won.
- Tambahkan grafik tren harian SF/Close Won serta tabel ringkasan per tanggal.
- Buat insight dan rekomendasi Weekly mengikuti hari terbaik, hari terendah, konversi, dan cakupan cluster.
- Pertahankan filter bulan untuk analisis HC dan ticket karena kedua dataset tersebut hanya memiliki tingkat detail bulanan.
- Pastikan ekspor profiling Weekly mengikuti rentang tanggal harian yang dipilih.

## Teknis
- Perubahan dibatasi pada tampilan dan agregasi `Reports`; struktur data, parser Excel, upload, dan perhitungan modul lain tidak diubah.
- Tanggal yang valid dibaca dari `profilingDate`, dengan `timestamp` sebagai cadangan.
- Hari tanpa data tetap dapat dipilih dan menampilkan kondisi kosong yang jelas.

## Verifikasi
- Jalankan pemeriksaan TypeScript.
- Uji tab Weekly pada layar desktop dan mobile, termasuk perubahan rentang tanggal dan kondisi tanpa data.
