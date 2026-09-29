# Rekap Check In / Check Out dari Grup WhatsApp

Mengubah ekspor chat grup WhatsApp menjadi Excel: siapa (unit) sudah Check In / Check Out, jam berapa, dan siapa yang belum lapor. Tanpa instalasi tambahan, cukup Node.js.

## Cara pakai (harian)
1. Di WhatsApp: buka grup > menu titik tiga > **Lainnya > Ekspor chat > Tanpa media**. Simpan file `.txt`.
2. Di PowerShell, dari folder repo ini:
   ```
   node wa-report/rekap-checkin.mjs "D:\wilayah\Chat_WhatsApp.txt" rekap.xlsx
   ```
3. Opsi batas jam (untuk menandai terlambat):
   ```
   node wa-report/rekap-checkin.mjs chat.txt rekap.xlsx --batas-in=08:30 --batas-out=17:00
   ```

## Isi Excel
- **Matriks**: unit x tanggal. Hijau = lengkap, merah = tidak lapor, kuning = hanya In atau hanya Out.
- **Rekap Harian**: satu baris per unit per hari, dengan jam In/Out, status, dan catatan terlambat.
- **Detail Pesan**: semua pesan Check In/Out beserta isinya.

## Catatan
- Yang dihitung sebagai pesan laporan: pesan yang baris pertamanya `Check In` / `Check Out` (huruf besar/kecil dan tanda `*` tidak masalah), dan baris kedua adalah nama unit.
- Bila satu unit mengirim beberapa kali dalam sehari, dipakai Check In paling awal dan Check Out paling akhir.
- Nama unit yang ditulis berbeda diseragamkan lewat `ALIAS` di `rekap-checkin.mjs`.
- Hari pertama sebuah ekspor bisa tampak "Tidak lapor" bila Anda baru masuk grup di tengah hari itu.
- File chat dan hasil Excel berisi data nasabah dan tidak ikut di-commit (lihat `.gitignore`).
