# Rekap Gaji Kebersihan — versi WhatsApp (Fonnte)

Sistem absensi berbasis chat + perhitungan gaji otomatis untuk bisnis cleaning
service multi-lokasi. Admin melapor absensi lewat **WhatsApp**, sistem membaca,
menyimpan, dan membalas otomatis — lalu gaji & slip dihitung otomatis per lokasi.

```
Admin kirim chat WA  ─▶  Fonnte  ─▶  webhook server  ─▶  catat absensi
                                                           │
Karyawan terima slip ◀─  Fonnte  ◀──  balasan otomatis ◀──┘
```

## Yang bisa dilakukan lewat WhatsApp

Admin (nomor yang terdaftar) cukup chat ke nomor WhatsApp bisnis:

| Chat admin | Hasil |
|---|---|
| `Budi hadir` | Budi hadir hari ini di lokasi utamanya |
| `Ani hadir Mall Senayan shift pagi` | hadir di lokasi & shift tertentu |
| `Joko pindah ke Apartemen Sudirman besok` | ubah jadwal lokasi |
| `Siti sakit 5 okt` · `Agus izin kemarin` · `Budi alpha` | catat status |
| `Agus lembur 2 jam` | tambah lembur hari ini |
| `slip Budi` | sistem balas slip gaji Budi |
| `rekap` | ringkasan gaji semua karyawan |
| `bantuan` | daftar perintah |

Tanggal yang dikenali: `hari ini` (default), `besok`, `kemarin`, `lusa`,
`3 okt`, `5/10`.

Setup awal (lokasi, tarif, shift, karyawan, admin) dilakukan sekali lewat
**dashboard web** di `http://localhost:3000`.

## Cara menjalankan (lokal, untuk mencoba)

Butuh Node.js 18+.

```bash
cd server
npm install
cp .env.example .env     # lalu isi FONNTE_TOKEN jika sudah punya
npm start
```

Buka `http://localhost:3000`. Tanpa token Fonnte, sistem jalan **mode uji**:
semua balasan WhatsApp hanya tampil di log terminal (tidak benar-benar
terkirim). Uji logika: `npm test`.

## Menyambungkan ke WhatsApp lewat Fonnte

1. Daftar di **https://fonnte.com** dan buat *device* (scan QR dengan nomor
   WhatsApp khusus bisnis — sebaiknya bukan nomor pribadi Anda).
2. Salin **token** device dari dashboard Fonnte → isikan ke `FONNTE_TOKEN`
   di file `.env`.
3. Server harus bisa diakses dari internet (lihat **Deploy** di bawah). Setelah
   dapat alamat publik, mis. `https://domain-anda.com`, buka menu
   **Webhook/Autoreply** di Fonnte dan isi URL webhook:
   ```
   https://domain-anda.com/webhook
   ```
   Jika Anda mengisi `WEBHOOK_SECRET=rahasia123`, URL-nya menjadi
   `https://domain-anda.com/webhook/rahasia123`.
4. Di dashboard web, tab **Admin WA**, daftarkan nomor-nomor admin yang boleh
   melapor. (Jika daftar kosong, semua nomor diizinkan — kurang aman.)
5. Isi **No. WhatsApp** tiap karyawan di tab Karyawan agar slip bisa dikirim
   otomatis ke mereka.

> Catatan: Fonnte memakai jalur tidak resmi (seperti WhatsApp Web). Praktis &
> murah untuk UKM, tapi ada risiko blokir dari WhatsApp. Untuk jangka panjang
> yang paling aman, pertimbangkan WhatsApp Cloud API resmi dari Meta.

## Deploy agar menyala 24 jam

Webhook butuh server yang selalu online. Pilihan mudah & murah:

- **Railway / Render / Fly.io** — hubungkan repo, set *root directory* ke
  `server`, perintah start `npm start`, dan isi environment variable
  `FONNTE_TOKEN` (serta `WEBHOOK_SECRET`, `PORT` bila perlu).
- **VPS** (mis. Biznet/Niagahoster/DigitalOcean) — jalankan dengan `pm2`:
  ```bash
  npm install -g pm2 && pm2 start src/server.js --name rekap-gaji
  ```

Setelah online, salin alamat publiknya ke webhook Fonnte (langkah 3).

## Data & cadangan

Data tersimpan di `server/data.json`. Cadangkan berkala (tab **Backup** di
dashboard menyalin seluruh data; **Pulihkan** mengembalikannya). Di layanan
cloud yang filesystem-nya sementara, pasang *volume*/disk persisten atau ganti
ke database agar `data.json` tidak hilang saat restart.

## Konfigurasi (.env)

| Variabel | Fungsi |
|---|---|
| `FONNTE_TOKEN` | Token device Fonnte. Kosong = mode uji. |
| `WEBHOOK_SECRET` | Kata kunci di URL webhook (opsional, menambah keamanan). |
| `PORT` | Port server (default 3000). |
| `DATA_FILE` | Lokasi file data (opsional). |

## Struktur kode

```
server/
├── src/
│   ├── server.js     webhook WhatsApp + REST API + dashboard
│   ├── commands.js   menjalankan perintah chat -> balasan
│   ├── parser.js     membaca perintah chat Bahasa Indonesia
│   ├── payroll.js    perhitungan gaji & slip (tarif per lokasi)
│   ├── wa.js         kirim pesan via Fonnte
│   ├── store.js      penyimpanan data (data.json)
│   └── selftest.js   uji logika inti (npm test)
└── public/index.html dashboard web
```
