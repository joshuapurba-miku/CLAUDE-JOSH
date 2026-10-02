// Perhitungan gaji & pembuatan slip. Tarif dihitung per hari sesuai lokasi kerja.
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
  "Agustus", "September", "Oktober", "November", "Desember"];

export const rupiah = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
export function periodeLabel(ym) {
  const [y, m] = ym.split("-");
  return BULAN[+m - 1] + " " + y;
}

export function monthRecords(state, ym) {
  return Object.entries(state.attendance)
    .filter(([k]) => k.split("|")[1].startsWith(ym))
    .map(([k, v]) => { const [empId, date] = k.split("|"); return { key: k, empId, date, ...v }; });
}

export function calcEmployee(state, empId, ym) {
  const emp = state.employees.find((e) => e.id === empId);
  const locById = (id) => state.locations.find((l) => l.id === id);
  const defaultLoc = () => locById(emp.locId) || state.locations[0];
  const recs = monthRecords(state, ym).filter((r) => r.empId === empId);
  const perLoc = {};
  let pokok = 0, makan = 0, lemburRp = 0, hariHadir = 0;
  const count = { hadir: 0, dijadwalkan: 0, izin: 0, sakit: 0, alpha: 0, libur: 0 };
  for (const r of recs) {
    if (count[r.status] !== undefined) count[r.status]++;
    if (r.status !== "hadir") continue;
    const loc = locById(r.locId) || defaultLoc();
    if (!loc) continue;
    perLoc[loc.id] = perLoc[loc.id] || { loc, hari: 0, lembur: 0, pokok: 0, makan: 0, lemburRp: 0 };
    const p = perLoc[loc.id];
    p.hari++; p.pokok += loc.tarifHarian; p.makan += loc.uangMakan;
    const lj = Number(r.lembur) || 0;
    p.lembur += lj; p.lemburRp += lj * loc.tarifLembur;
    pokok += loc.tarifHarian; makan += loc.uangMakan; lemburRp += lj * loc.tarifLembur; hariHadir++;
  }
  const tunjangan = Number(emp.tunjangan) || 0, potongan = Number(emp.potongan) || 0;
  const bruto = pokok + makan + lemburRp + tunjangan;
  return { emp, perLoc: Object.values(perLoc), pokok, makan, lemburRp, tunjangan, potongan,
    bruto, total: bruto - potongan, hariHadir, count };
}

export function slipText(c, ym) {
  const L = [];
  L.push("*SLIP GAJI*");
  L.push("Periode : " + periodeLabel(ym));
  L.push("Nama    : " + c.emp.nama);
  L.push("Hari hadir: " + c.hariHadir);
  L.push("--------------------------------");
  for (const p of c.perLoc) {
    L.push(p.loc.nama);
    L.push("  " + p.hari + " hari x " + rupiah(p.loc.tarifHarian) + " = " + rupiah(p.pokok));
    if (p.makan) L.push("  Uang makan = " + rupiah(p.makan));
    if (p.lemburRp) L.push("  Lembur " + p.lembur + " jam = " + rupiah(p.lemburRp));
  }
  L.push("--------------------------------");
  L.push("Gaji pokok : " + rupiah(c.pokok));
  L.push("Uang makan : " + rupiah(c.makan));
  if (c.lemburRp) L.push("Lembur     : " + rupiah(c.lemburRp));
  if (c.tunjangan) L.push("Tunjangan  : " + rupiah(c.tunjangan));
  if (c.potongan) L.push("Potongan   : -" + rupiah(c.potongan));
  L.push("================================");
  L.push("*TOTAL DITERIMA: " + rupiah(c.total) + "*");
  return L.join("\n");
}

export function rekapText(state, ym) {
  const rows = state.employees.map((e) => calcEmployee(state, e.id, ym));
  const L = ["*REKAP GAJI " + periodeLabel(ym) + "*", ""];
  for (const r of rows) L.push(`${r.emp.nama} | ${r.hariHadir} hari | ${rupiah(r.total)}`);
  L.push("");
  L.push("*TOTAL: " + rupiah(rows.reduce((s, r) => s + r.total, 0)) + "*");
  return L.join("\n");
}
