# GOKLIRR Screening — Sistem Penilaian Kandidat Otomatis

Aplikasi web untuk **screening CV pelamar GOKLIRR (cleaning service)** secara otomatis menggunakan AI.
Upload CV → AI baca + nilai 6 dimensi → muncul rekomendasi → track sampai diterima/ditolak.

## Fitur

- **Upload CV otomatis** — PDF, JPG, PNG, WEBP. Bisa banyak file sekaligus.
- **AI scoring** — Claude AI baca CV (termasuk OCR foto) lalu menilai 6 dimensi:
  attitude, kesiapan fisik, pengalaman, disiplin, komitmen, komunikasi.
- **Bonus & penalti otomatis** — sesuai aturan GOKLIRR (resign cepat, usia sweet spot, dll).
- **Rekomendasi** — `Lanjut` / `Dipertimbangkan` / `Ditolak` berdasarkan threshold skor.
- **Dashboard** — tabel pelamar dengan filter, search, sort, dan export CSV.
- **Pipeline (Kanban)** — drag & drop kandidat antar status: Applied → Screening → Interview → Offer → Hired/Rejected.
- **Detail kandidat** — breakdown skor + reasoning AI + timeline rekrutmen + catatan HR.
- **Database lokal SQLite** — semua data tersimpan otomatis.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma + SQLite · Claude AI (`@anthropic-ai/sdk`).

---

## Cara Setup (sekali saja)

### 1. Install dependencies

Pastikan **Node.js 20+** sudah terpasang (cek: `node -v`).

```bash
npm install
```

### 2. Dapatkan Claude API Key

Aplikasi ini perlu API key dari Anthropic untuk akses AI yang membaca & menilai CV.

**Langkah-langkah:**

1. Buka https://console.anthropic.com
2. Sign up (gratis) — login pakai email atau Google
3. Klik menu **"API Keys"** di sidebar kiri
4. Klik tombol **"Create Key"** → kasih nama (misal: `goklirr-screening`) → copy key-nya
   (formatnya `sk-ant-api03-xxxxx…`)
5. Untuk testing awal, isi minimal **$5 credit** di menu **"Plans & Billing"** (cukup untuk ratusan CV)

### 3. Konfigurasi `.env`

File `.env` sudah dibuat otomatis. Buka dan ganti baris ini:

```env
ANTHROPIC_API_KEY="sk-ant-paste-key-mu-disini"
```

### 4. Setup database

```bash
npx prisma db push
```

Akan membuat file `dev.db` (SQLite lokal).

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka di browser: **http://localhost:3000**

---

## Cara Pakai

### Upload CV pelamar

1. Klik **"Upload CV"** di header
2. Drop / pilih satu atau lebih file CV (PDF atau foto)
3. Atau tulis info kandidat manual di kotak teks (untuk yang tidak punya CV)
4. Klik **"Screening Sekarang"** → tunggu beberapa detik per file
5. Hasil scoring langsung muncul, otomatis tersimpan ke database

### Lihat Dashboard

- Halaman utama (`/`) menampilkan semua kandidat
- Filter berdasarkan status, rekomendasi
- Search by nama / kota / posisi
- Sort by skor, tanggal, nama
- Klik **"Export CSV"** untuk download seluruh database

### Pipeline rekrutmen

- Halaman `/pipeline` — Kanban board
- **Drag & drop** kartu kandidat antar kolom untuk update status
- Setiap perubahan otomatis tercatat di timeline kandidat

### Detail kandidat

- Klik nama kandidat di tabel atau kartu
- Lihat breakdown skor per dimensi + alasan AI
- Lihat bonus/penalti yang dikenakan
- Tambah catatan HR
- Update status (Applied → Screening → ...)
- Lihat timeline lengkap proses rekrutmen
- Hapus kandidat (jika perlu)

---

## Bobot Skor

| Dimensi          | Bobot |
| ---------------- | ----- |
| Attitude         | 20%   |
| Kesiapan Fisik   | 20%   |
| Pengalaman       | 20%   |
| Disiplin         | 15%   |
| Komitmen         | 15%   |
| Komunikasi       | 10%   |

**Penalti otomatis:**
- Sering resign <3 bulan: −1.5
- Pernah resign mendadak: −0.5
- Usia <20 tahun: −0.5
- Motivasi tidak jelas / coba-coba: −0.5

**Bonus otomatis:**
- Pengalaman 3+ tahun di cleaning service: +0.5
- Usia 25–40 (sweet spot): +0.3
- Punya kendaraan sendiri: +0.2

**Threshold rekomendasi:**
- Skor ≥ 7.5 → **Lanjut**
- Skor 5.0–7.4 → **Dipertimbangkan**
- Skor < 5.0 → **Ditolak**

---

## Struktur Project

```
src/
  app/
    page.tsx                     # Dashboard
    upload/page.tsx              # Halaman upload CV
    pipeline/page.tsx            # Kanban pipeline
    candidates/[id]/page.tsx     # Detail kandidat
    api/
      upload/route.ts            # Upload + AI scoring
      candidates/[id]/route.ts   # Delete kandidat
      candidates/[id]/status/route.ts # Update status
      candidates/[id]/notes/route.ts  # Tambah catatan
      export/route.ts            # Export CSV
  lib/
    db.ts        # Prisma client
    claude.ts    # Integrasi Claude AI (CV parsing + scoring prompt)
    scoring.ts   # Logika skoring (bobot, bonus, penalti)
    types.ts     # Types & konstanta
  components/
    UploadForm.tsx
    CandidateTable.tsx
    KanbanBoard.tsx
    StatusBadge.tsx
    ScoreBar.tsx
    StatusControl.tsx
    NoteForm.tsx
    DeleteButton.tsx
prisma/
  schema.prisma  # Schema database
  dev.db         # SQLite database (di-generate)
```

---

## Perintah Berguna

```bash
npm run dev          # development server
npm run build        # production build
npm start            # production server
npm run db:studio    # buka Prisma Studio (UI database)
npm run db:push      # apply schema ke database
```

## Tips

- **Backup database**: copy file `dev.db` secara berkala
- **Multi-user / deployment**: deploy ke Vercel / Railway. Untuk multi-user, ganti SQLite ke Postgres (edit `prisma/schema.prisma` → ganti `provider = "postgresql"`)
- **Biaya AI**: per CV biasanya <$0.01 (claude-sonnet-4-5). Bisa diturunkan ke `claude-haiku-4-5-20251001` (lebih murah) di `.env`.

---

## Troubleshooting

**Error: "ANTHROPIC_API_KEY belum di-set"**
→ Edit file `.env` dan paste API key dari console.anthropic.com

**Error: "credit balance is too low"**
→ Top up di https://console.anthropic.com/settings/plans (minimal $5)

**CV tidak terbaca / hasil aneh**
→ Pastikan foto CV cukup jelas / PDF tidak rusak. Bisa coba input manual.
