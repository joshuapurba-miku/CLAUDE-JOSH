// Parser perintah chat sederhana (Bahasa Indonesia) untuk absensi & jadwal.
// Tidak butuh AI. Dipakai oleh webhook WhatsApp maupun dashboard web.
import dayjs from "dayjs";

const STATUS_KW = {
  hadir: ["hadir", "masuk", "kerja", "absen masuk"],
  izin: ["izin", "ijin", "cuti"],
  sakit: ["sakit"],
  alpha: ["alpha", "alfa", "mangkir", "bolos", "tanpa kabar"],
  libur: ["libur", "off"],
};
const MONTHS = {
  januari: 0, jan: 0, februari: 1, feb: 1, maret: 2, mar: 2, mrt: 2, april: 3, apr: 3, mei: 4,
  juni: 5, jun: 5, juli: 6, jul: 6, agustus: 7, agu: 7, ags: 7, agt: 7, september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, november: 10, nov: 10, nop: 10, desember: 11, des: 11,
};

export function parseDate(text, now = dayjs()) {
  const t = " " + text.toLowerCase() + " ";
  if (/\b(hari ini|hr ini|skrg|sekarang)\b/.test(t)) return now;
  if (/\b(besok|bsk|esok)\b/.test(t)) return now.add(1, "day");
  if (/\b(lusa)\b/.test(t)) return now.add(2, "day");
  if (/\b(kemarin|kmrn|kmaren)\b/.test(t)) return now.subtract(1, "day");
  let m = t.match(/\b(\d{1,2})\s+([a-z]{3,9})\b/);
  if (m && MONTHS[m[2]] !== undefined) return now.month(MONTHS[m[2]]).date(+m[1]);
  m = t.match(/\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b/);
  if (m) {
    let d = now.date(+m[1]).month(+m[2] - 1);
    if (m[3]) d = d.year(+(m[3].length === 2 ? "20" + m[3] : m[3]));
    return d;
  }
  return now;
}

function findEmployee(text, employees) {
  const low = text.toLowerCase();
  let best = null, bestIdx = 1e9, bestLen = 0;
  for (const e of employees) {
    const parts = [e.nama.toLowerCase(), e.nama.toLowerCase().split(" ")[0]];
    for (const p of parts) {
      const i = low.indexOf(p);
      if (i >= 0 && (i < bestIdx || (i === bestIdx && p.length > bestLen))) {
        best = e; bestIdx = i; bestLen = p.length;
      }
    }
  }
  return best;
}
function findLocation(text, locations) {
  const low = text.toLowerCase();
  let best = null, score = 0;
  for (const l of locations) {
    const name = l.nama.toLowerCase();
    if (low.includes(name)) { if (name.length > score) { best = l; score = name.length; } continue; }
    for (const w of name.split(/\s+/)) {
      if (w.length >= 4 && low.includes(w) && w.length > score) { best = l; score = w.length; }
    }
  }
  return best;
}
function findShift(text, loc) {
  if (!loc) return null;
  const low = text.toLowerCase();
  let best = null;
  for (const s of loc.shifts || []) if (low.includes(s.nama.toLowerCase())) best = s;
  return best;
}

// Mengembalikan { type, ... }.
// type: 'attendance' | 'help' | 'rekap' | 'slip' | 'error'
export function parseCommand(raw, state, now = dayjs()) {
  const text = (raw || "").trim();
  if (!text) return { type: "error", msg: "Perintah kosong." };
  const low = text.toLowerCase();

  // perintah query
  if (/^(bantuan|help|\?|menu)\b/.test(low)) return { type: "help" };
  if (/^rekap\b/.test(low)) return { type: "rekap", month: (low.match(/\d{4}-\d{2}/) || [])[0] };
  if (/^slip\b/.test(low)) {
    const emp = findEmployee(text.replace(/^slip/i, ""), state.employees);
    return { type: "slip", emp, month: (low.match(/\d{4}-\d{2}/) || [])[0] };
  }

  const emp = findEmployee(text, state.employees);
  if (!emp) return { type: "error", msg: "Nama karyawan tidak dikenali. Pastikan sudah terdaftar." };

  const date = parseDate(text, now);
  const dateStr = date.format("YYYY-MM-DD");

  let status = null;
  for (const [st, kws] of Object.entries(STATUS_KW)) {
    if (kws.some((k) => low.includes(k))) { status = st; break; }
  }
  let lembur = null;
  const lm = low.match(/lembur\s*(\d+(?:[.,]\d+)?)\s*jam/);
  if (lm) lembur = Number(lm[1].replace(",", "."));

  const loc = findLocation(text, state.locations);
  const key = emp.id + "|" + dateStr;
  const existing = state.attendance[key];

  if (!status && !loc && lembur === null) {
    return { type: "error", msg: `Perintah untuk ${emp.nama} belum lengkap. Sebutkan status (hadir/sakit/izin/alpha/libur), lokasi, atau lembur.` };
  }
  if (!status && /\b(pindah|jadwal|shift)\b/.test(low) && !existing) status = "dijadwalkan";

  const base = existing ? { ...existing } : { status: "dijadwalkan" };
  const targetLoc = loc || state.locations.find((l) => l.id === base.locId) ||
    state.locations.find((l) => l.id === emp.locId) || state.locations[0];
  if (!targetLoc) return { type: "error", msg: "Belum ada lokasi terdaftar." };
  const shift = findShift(text, targetLoc);
  const rec = {
    status: status || base.status || "dijadwalkan",
    locId: targetLoc.id,
    shift: shift ? shift.nama : (base.shift || (targetLoc.shifts[0] && targetLoc.shifts[0].nama) || ""),
    masuk: shift ? shift.masuk : (base.masuk || (targetLoc.shifts[0] ? targetLoc.shifts[0].masuk : "")),
    pulang: shift ? shift.pulang : (base.pulang || (targetLoc.shifts[0] ? targetLoc.shifts[0].pulang : "")),
    lembur: lembur !== null ? lembur : (base.lembur || 0),
  };
  return { type: "attendance", emp, date: dateStr, key, rec, loc: targetLoc };
}
