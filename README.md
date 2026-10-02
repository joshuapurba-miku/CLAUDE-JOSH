# Rekap Gaji Kebersihan

Sistem rekap absensi berbasis chat + perhitungan gaji otomatis untuk bisnis
cleaning service yang karyawannya bekerja di banyak lokasi dengan tarif, shift,
dan jam kerja berbeda.

Tersedia dua versi:

## 1. Aplikasi web (tanpa setup) — `index.html`
Buka `index.html` di browser (HP/laptop). Cocok untuk langsung mencoba.
- Setup lokasi (tarif harian, uang makan, lembur, shift) & karyawan
- Catat absensi lewat chat sederhana (mis. `Budi hadir Mall Senayan shift pagi`)
- Rekap gaji otomatis per lokasi + slip yang bisa disalin ke WhatsApp
- Data tersimpan di perangkat; ada menu Backup

## 2. Versi WhatsApp — folder `server/`
Admin melapor absensi langsung lewat **WhatsApp** (via penyedia Fonnte), sistem
membaca & membalas otomatis, lalu slip dikirim otomatis ke karyawan.
Butuh Node.js, akun Fonnte, dan hosting. Panduan lengkap: [`server/README.md`](server/README.md).

```
Admin chat WA ─▶ Fonnte ─▶ webhook server ─▶ catat absensi ─▶ balasan & slip otomatis
```

Keduanya memakai logika perhitungan gaji yang sama: gaji dihitung **per hari
sesuai lokasi tempat karyawan bekerja**, ditambah lembur & tunjangan, dikurangi
potongan.
