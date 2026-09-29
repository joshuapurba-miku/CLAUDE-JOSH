// Analisis lanjutan: Rencana (Check In) vs Realisasi (Check Out) dan sheet Prognosa.
import { STYLE } from "./xlsx.mjs";

const H = (v) => ({ v, s: STYLE.HEADER });
const fmtDay = (d) => d.split("-").reverse().join("/");
const STOP = new Set(("arm prm rrm rm bo sbo kc kcp obo deb jt juta rp baru plf ki kki kmk tambahan downsizing pelunasan " +
  "an atas nama dan yang dari untuk cabang cluster branch office").split(" "));
const tokens = (text) => new Set(text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)));

// Item = satu debitur/transaksi. Baris induk (BWU, Pelunasan) dilewati bila rinciannya ada agar tidak dobel.
function buildItems(nominal, used, amountOf) {
  const subs = new Map();
  for (const x of nominal) if (/^(BWU |Pelunasan Deb)/.test(x.kategori)) subs.set(`${x.report.id}|${x.kategori.startsWith("BWU") ? "BWU" : "Pelunasan"}`, true);
  const items = [];
  for (const x of nominal) {
    if (!used(x.report) || (subs.get(`${x.report.id}|${x.kategori}`) && (x.kategori === "BWU" || x.kategori === "Pelunasan"))) continue;
    const details = x.ket ? x.ket.split(" ; ") : [""];
    for (const text of details) {
      const own = text ? amountOf(text) : null;
      items.push({
        unit: x.report.unit, kategori: x.kategori, date: x.report.date, type: x.report.type, time: x.report.time,
        text, tokens: tokens(text), nominal: own ?? (details.length === 1 ? x.nominal : null),
      });
    }
  }
  return items;
}

// Debitur yang sama: nama berbagi kata (>= 5 huruf, atau >= 2 kata). Tanpa nama sama sekali: cocokkan lewat nominal.
const family = (k) => (k.startsWith("BWU") ? "BWU" : k.startsWith("Pelunasan") ? "Pelunasan" : k); // "BWU" = "BWU Pandu", dst.
function sameDebtor(a, b) {
  if (a.unit !== b.unit || family(a.kategori) !== family(b.kategori)) return false;
  const shared = [...a.tokens].filter((t) => b.tokens.has(t));
  if (shared.length) return shared.length >= 2 || shared[0].length >= 5;
  return (!a.tokens.size || !b.tokens.size) && a.nominal != null && a.nominal === b.nominal;
}
const named = (a, b) => a.tokens.size && b.tokens.size;

export function rencanaSheets(nominal, reports, used, amountOf, units) {
  const items = buildItems(nominal, used, amountOf);
  const plans = items.filter((i) => i.type === "IN").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const outs = items.filter((i) => i.type === "OUT");
  const hasOut = new Set(reports.filter((r) => r.type === "OUT").map((r) => `${r.unit}|${r.date}`));

  for (const pass of [true, false]) for (const p of plans) { // 1. realisasi di hari yang sama (nama cocok dulu, baru lewat nominal)
    if (p.real) continue;
    const o = outs.find((x) => !x.plan && x.date === p.date && (!pass || named(p, x)) && sameDebtor(p, x));
    if (o) { o.plan = p; p.real = o; }
  }
  for (const p of plans) { // 2. belum terealisasi: cari Check Out hari berikutnya, atau rencana ulang
    if (p.real) continue;
    const o = outs.find((x) => !x.plan && x.date > p.date && named(p, x) && sameDebtor(p, x));
    if (o) { o.plan = p; p.real = o; continue; }
    const again = plans.find((x) => !x.prev && x !== p && x.date > p.date && named(p, x) && sameDebtor(p, x));
    if (again) { again.prev = p; p.next = again; }
  }
  const outcome = (p, guard = 0) => (p.real ? p.real : p.next && guard < 30 ? outcome(p.next, guard + 1) : null);

  const cnt = new Map(); // ringkasan per unit
  const bump = (unit, k, n = 1, v = 0) => { const c = cnt.get(unit) || { total: 0, hari: 0, tunda: 0, gagal: 0, nomPlan: 0, nomReal: 0 }; c[k] += n; c.nomPlan += k === "total" ? v : 0; c.nomReal += k === "hari" || k === "tunda" ? v : 0; cnt.set(unit, c); };
  const rows = [[H("Tgl rencana"), H("Unit"), H("Kategori"), H("Debitur / rincian"), H("Nominal rencana (Rp juta)"), H("Status"), H("Tgl realisasi"), H("Nominal realisasi (Rp juta)"), H("Catatan")]];
  const list = [];
  for (const p of plans) {
    const o = outcome(p), notes = [];
    let status, style;
    if (o && o === p.real && o.date === p.date) { status = "Terealisasi hari itu"; style = STYLE.OK; }
    else if (o) { status = "Tertunda, terealisasi kemudian"; style = STYLE.WARN; }
    else { status = "Tidak terealisasi"; style = STYLE.BAD; }
    if (p.prev) notes.push(`Rencana ulang dari tgl ${fmtDay(p.prev.date)}`);
    if (p.next) notes.push(`Diajukan lagi di Check In tgl ${fmtDay(p.next.date)}`);
    if (!o && !hasOut.has(`${p.unit}|${p.date}`)) notes.push("Tidak ada Check Out hari itu");
    if (o && p.nominal != null && o.nominal != null && o.nominal !== p.nominal) notes.push("Nominal berbeda dari rencana");
    bump(p.unit, "total", 1, p.nominal || 0);
    if (style === STYLE.OK) bump(p.unit, "hari", 1, o.nominal || 0);
    else if (style === STYLE.WARN) bump(p.unit, "tunda", 1, 0);
    else bump(p.unit, "gagal");
    list.push([p.date, p.unit, [
      fmtDay(p.date), p.unit, p.kategori, p.text, p.nominal ?? "", { v: status, s: style }, o ? fmtDay(o.date) : "", o?.nominal ?? "", notes.join("; "),
    ]]);
  }
  for (const o of outs) if (!o.plan) list.push([o.date, o.unit, [
    fmtDay(o.date), o.unit, o.kategori, o.text, "", { v: "Realisasi tanpa rencana (Check In)", s: STYLE.WARN }, fmtDay(o.date), o.nominal ?? "", "",
  ]]);
  list.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  for (const [, , row] of list) rows.push(row);

  const ringkas = [[H("Unit"), H("Item rencana"), H("Terealisasi hari itu"), H("Tertunda, terealisasi kemudian"), H("Tidak terealisasi"), H("Nominal rencana (Rp juta)")]];
  for (const u of units) { const c = cnt.get(u) || { total: 0, hari: 0, tunda: 0, gagal: 0, nomPlan: 0 }; ringkas.push([u, c.total, c.hari, c.tunda, c.gagal, c.nomPlan]); }
  return [
    { name: "Rencana vs Realisasi", rows, widths: [12, 26, 22, 60, 16, 30, 13, 18, 50] },
    { name: "Ringkasan Rencana", rows: ringkas, widths: [26, 13, 18, 26, 17, 20] },
  ];
}

// --- Prognosa ---
const NUM = /([+-])?\s*(?:rp\.?)?\s*([+-])?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:rp\s*)?(jt|juta|miliar|m)?(?![a-z0-9])/gi;
const num = (s) => (/^\d{1,3}([.,]\d{3})+$/.test(s) ? parseFloat(s.replace(/[.,]/g, "")) : parseFloat(s.replace(",", ".")));
const amounts = (t) => [...t.matchAll(NUM)].map((m) => {
  const unit = (m[4] || "").toLowerCase();
  if (!unit) return { value: null, raw: m[0] };
  const v = num(m[3]) * (unit === "m" || unit === "miliar" ? 1000 : 1);
  return { value: (m[1] === "-" || m[2] === "-" ? -1 : 1) * v, raw: m[0] };
});
const END = /^(aktivasi|akuisisi|closing|qris|wondr|terima)/i;

export function prognosaSheet(reports, used) {
  const rows = [[H("Tanggal"), H("Jenis"), H("Unit"), H("Metrik"), H("Posisi (Rp juta)"), H("Selisih vs komitmen (Rp juta)"), H("Komitmen/target (Rp juta)"), H("Teks asli"), H("Catatan")]];
  // Posisi akhir hari (Check Out); Check In dipakai hanya bila unit tidak mengirim Check Out hari itu.
  const hasOut = new Set(reports.filter((r) => r.type === "OUT").map((r) => `${r.unit}|${r.date}`));
  const prev = new Map(); // unit|metrik -> posisi terakhir, untuk mendeteksi angka yang tidak diperbarui
  const sorted = reports.filter((r) => used(r) && (r.type === "OUT" || !hasOut.has(`${r.unit}|${r.date}`))).sort((a, b) => a.date.localeCompare(b.date) || a.unit.localeCompare(b.unit) || a.type.localeCompare(b.type));
  for (const r of sorted) {
    const lines = r.body.split("\n").map((l) => l.replace(/[*_⁠‎‏]/g, "").trim()).filter(Boolean);
    const start = lines.findIndex((l) => /prognosa/i.test(l));
    if (start < 0) continue;
    let pending = "";
    for (const raw of lines.slice(start + 1)) {
      const line = raw.replace(/^[^A-Za-z]+/, "");
      if (END.test(line)) break;
      if (!/rp/i.test(raw)) { if (raw.length < 70 && !/\d/.test(raw)) pending = line.replace(/[:;]\s*$/, ""); continue; } // judul metrik di baris sendiri
      const mm = /^(.*?)\s*(?::|(?=\brp)|(?=\d))/i.exec(line);
      const metric = (mm && mm[1]) || pending || "(tidak disebut)";
      pending = "";
      const body = line.slice(mm ? mm[0].length : 0);
      const [before, after = ""] = body.split(/\batau\b/i);
      const posisi = amounts(before)[0];
      const selisih = after ? amounts(after.split(/\b(?:dari|komitmen|target|tprop)\b/i)[0])[0] : null;
      const km = [...line.matchAll(/(?:komitmen|target|tprop)[^\d]*?((?:rp\.?)?\s*\d[\d.,]*\s*(?:jt|juta|miliar|m)?)/gi)].at(-1);
      const komitmen = km ? amounts(km[1])[0] : null;
      const unclear = [posisi, selisih, komitmen].some((a) => a && a.value === null);
      const key = `${r.unit}|${metric.toLowerCase()}`, stale = posisi?.value != null && prev.get(key) === posisi.value;
      if (posisi?.value != null) prev.set(key, posisi.value);
      const note = [unclear && "Satuan tidak tertulis, cek teks asli", stale && "Angka sama dengan laporan sebelumnya (mungkin belum diperbarui)"].filter(Boolean).join("; ");
      rows.push([fmtDay(r.date), r.type === "IN" ? "Check In" : "Check Out", r.unit, metric, posisi?.value ?? "", selisih?.value ?? "", komitmen?.value ?? "", raw, note ? { v: note, s: STYLE.WARN } : ""]);
    }
  }
  return { name: "Prognosa", rows, widths: [12, 11, 26, 26, 16, 20, 18, 90, 50] };
}
