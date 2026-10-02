// Penyimpanan data sederhana berbasis file JSON (sumber kebenaran tunggal).
// Cocok untuk skala UKM; bisa diganti database bila sudah besar.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "..", "data.json");

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function emptyState() {
  return { locations: [], employees: [], admins: [], attendance: {} };
}

function seed() {
  const l1 = uid(), l2 = uid(), l3 = uid();
  const locations = [
    { id: l1, nama: "Mall Senayan", tarifHarian: 125000, uangMakan: 20000, tarifLembur: 18000,
      shifts: [{ nama: "Pagi", masuk: "07:00", pulang: "15:00" }, { nama: "Siang", masuk: "14:00", pulang: "22:00" }] },
    { id: l2, nama: "Apartemen Sudirman", tarifHarian: 110000, uangMakan: 15000, tarifLembur: 15000,
      shifts: [{ nama: "Pagi", masuk: "06:00", pulang: "14:00" }, { nama: "Malam", masuk: "22:00", pulang: "06:00" }] },
    { id: l3, nama: "Kantor Thamrin", tarifHarian: 140000, uangMakan: 25000, tarifLembur: 20000,
      shifts: [{ nama: "Pagi", masuk: "07:30", pulang: "16:30" }] },
  ];
  const e = (nama, locId, tunjangan, potongan, phone) => ({ id: uid(), nama, locId, tunjangan, potongan, phone: phone || "" });
  const employees = [
    e("Budi Santoso", l1, 0, 0), e("Ani Lestari", l1, 50000, 0),
    e("Joko Prasetyo", l2, 0, 100000), e("Siti Rahma", l2, 0, 0),
    e("Agus Wijaya", l3, 75000, 0),
  ];
  // Admin contoh — GANTI dengan nomor WhatsApp admin Anda yang sebenarnya.
  const admins = [{ nama: "Admin Contoh", phone: "6281234567890" }];
  return { locations, employees, admins, attendance: {}, isSample: true };
}

let cache = null;

export function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      // pastikan field lengkap
      cache = { ...emptyState(), ...cache };
    } else {
      cache = seed();
      persist();
    }
  } catch (err) {
    console.error("Gagal membaca data, memakai data kosong:", err.message);
    cache = emptyState();
  }
  return cache;
}

export function persist() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error("Gagal menyimpan data:", err.message);
  }
}

// Ganti seluruh state (restore) atau sebagian.
export function setState(next) {
  cache = { ...emptyState(), ...next };
  persist();
  return cache;
}

export function reseed() {
  cache = seed();
  persist();
  return cache;
}

export function getState() {
  return load();
}
