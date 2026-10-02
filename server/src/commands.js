// Menjalankan perintah chat terhadap store, lalu menyusun balasan teks.
import dayjs from "dayjs";
import { parseCommand } from "./parser.js";
import { persist } from "./store.js";
import { calcEmployee, slipText, rekapText } from "./payroll.js";

const HELP = [
  "*Perintah yang bisa dipakai:*",
  "• Budi hadir",
  "• Ani hadir Mall Senayan shift pagi",
  "• Joko pindah ke Apartemen Sudirman besok",
  "• Siti sakit 5 okt  /  Agus izin kemarin  /  Budi alpha",
  "• Agus lembur 2 jam",
  "• slip Budi  — kirim slip gaji",
  "• rekap  — ringkasan gaji semua karyawan",
  "Tanggal: hari ini (default), besok, kemarin, lusa, 3 okt, 5/10",
].join("\n");

// Mengembalikan { ok, reply, result }
export function applyCommand(text, state, now = dayjs()) {
  const res = parseCommand(text, state, now);
  if (res.type === "help") return { ok: true, reply: HELP, result: res };
  if (res.type === "rekap") {
    const ym = res.month || now.format("YYYY-MM");
    return { ok: true, reply: rekapText(state, ym), result: res };
  }
  if (res.type === "slip") {
    if (!res.emp) return { ok: false, reply: "Karyawan tidak dikenali. Contoh: slip Budi", result: res };
    const ym = res.month || now.format("YYYY-MM");
    return { ok: true, reply: slipText(calcEmployee(state, res.emp.id, ym), ym), result: res };
  }
  if (res.type === "error") return { ok: false, reply: "⚠ " + res.msg, result: res };

  // attendance: tulis ke store
  state.attendance[res.key] = res.rec;
  persist();
  const parts = [`✓ *${res.emp.nama}* — ${dayjs(res.date).format("DD MMM YYYY")}`];
  parts.push("Status: " + res.rec.status);
  parts.push("Lokasi: " + res.loc.nama);
  if (res.rec.shift) parts.push("Shift: " + res.rec.shift);
  if (res.rec.lembur) parts.push("Lembur: " + res.rec.lembur + " jam");
  return { ok: true, reply: parts.join("\n"), result: res };
}
