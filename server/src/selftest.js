// Uji logika inti tanpa jaringan: parser, perintah, dan perhitungan gaji.
import dayjs from "dayjs";
import { applyCommand } from "./commands.js";
import { calcEmployee, rupiah } from "./payroll.js";

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = String(got) === String(want);
  console.log(`${ok ? "✓" : "✗"} ${name}: ${got}${ok ? "" : " (harusnya " + want + ")"}`);
  ok ? pass++ : fail++;
}

// state uji
const L1 = "L1", L2 = "L2";
const state = {
  locations: [
    { id: L1, nama: "Mall Senayan", tarifHarian: 125000, uangMakan: 20000, tarifLembur: 18000, shifts: [{ nama: "Pagi", masuk: "07:00", pulang: "15:00" }] },
    { id: L2, nama: "Apartemen Sudirman", tarifHarian: 110000, uangMakan: 15000, tarifLembur: 15000, shifts: [{ nama: "Malam", masuk: "22:00", pulang: "06:00" }] },
  ],
  employees: [
    { id: "E1", nama: "Budi Santoso", locId: L1, tunjangan: 50000, potongan: 100000, phone: "" },
    { id: "E2", nama: "Ani Lestari", locId: L1, tunjangan: 0, potongan: 0, phone: "" },
  ],
  admins: [],
  attendance: {},
};
const NOW = dayjs("2026-10-15");

// Skenario chat
applyCommand("Budi hadir", state, dayjs("2026-10-01"));
applyCommand("Budi hadir Apartemen Sudirman shift malam 2 okt", state, NOW);
applyCommand("Budi lembur 2 jam", state, dayjs("2026-10-01")); // tambah lembur ke 1 okt (Mall)
applyCommand("Ani sakit", state, dayjs("2026-10-03"));
const err = applyCommand("Orang asing hadir", state, NOW);

check("nama tak dikenal -> error", err.ok, "false");
check("Budi 1 okt = Mall", state.attendance["E1|2026-10-01"].locId, L1);
check("Budi 1 okt lembur = 2", state.attendance["E1|2026-10-01"].lembur, "2");
check("Budi 2 okt = Apartemen", state.attendance["E1|2026-10-02"].locId, L2);
check("Budi 2 okt shift = Malam", state.attendance["E1|2026-10-02"].shift, "Malam");
check("Ani 3 okt = sakit", state.attendance["E2|2026-10-03"].status, "sakit");

// Perhitungan gaji Budi:
// 1 okt Mall: 125000 + makan 20000 + lembur 2*18000=36000
// 2 okt Apt : 110000 + makan 15000
// pokok = 235000, makan = 35000, lembur = 36000, tunj 50000, pot 100000
const c = calcEmployee(state, "E1", "2026-10");
check("Budi hari hadir", c.hariHadir, "2");
check("Budi pokok", c.pokok, 235000);
check("Budi uang makan", c.makan, 35000);
check("Budi lembur Rp", c.lemburRp, 36000);
check("Budi total", c.total, 235000 + 35000 + 36000 + 50000 - 100000); // 256000

// Query slip & rekap
const slip = applyCommand("slip Budi", state, NOW);
check("slip ok", slip.ok, "true");
check("slip memuat total", /TOTAL DITERIMA/.test(slip.reply), "true");
const rekap = applyCommand("rekap", state, NOW);
check("rekap ok", rekap.ok, "true");

console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
console.log("Contoh balasan slip:\n" + slip.reply);
process.exit(fail ? 1 : 0);
