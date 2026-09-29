#!/usr/bin/env node
// Rekap Check In / Check Out harian dari ekspor chat grup WhatsApp -> Excel.
// Pakai: node rekap-checkin.mjs <chat.txt> [hasil.xlsx] [--batas-in=08:30] [--batas-out=17:00]
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildXlsx, STYLE } from "./xlsx.mjs";
import { rencanaSheets, prognosaSheet } from "./rencana.mjs";

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
let [input, output] = args.filter((a) => !a.startsWith("--"));
// Bila <chat.txt> berupa folder: pakai file .txt terbaru di folder itu, hasil bernama rekap-TAHUN-BULAN-TANGGAL.xlsx di folder "rekap" sebelahnya.
if (input && statSync(input, { throwIfNoEntry: false })?.isDirectory()) {
  const files = readdirSync(input).filter((f) => f.toLowerCase().endsWith(".txt")).map((f) => join(input, f));
  if (!files.length) { console.error(`Tidak ada file .txt di folder ${input}`); process.exit(1); }
  const newest = files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  const outDir = join(dirname(input.replace(/[\\/]+$/, "")), "rekap");
  mkdirSync(outDir, { recursive: true });
  output ??= join(outDir, `rekap-${new Date().toLocaleDateString("sv-SE")}.xlsx`);
  console.log(`Memakai file terbaru: ${newest}`);
  input = newest;
}
output ??= "rekap-checkin.xlsx";
if (!input) { console.error("Pakai: node rekap-checkin.mjs <chat.txt> [hasil.xlsx] [--batas-in=08:30] [--batas-out=17:00]"); process.exit(1); }

// Nama unit yang ditulis berbeda -> nama baku.
const ALIAS = { "branch bau bau": "Cluster Bau Bau" };
const MSG_START = /^(\d\d)\/(\d\d)\/(\d\d) (\d\d)\.(\d\d) - (.*)$/;
const KIND = /^check\s*-?\s*(in|out)\b/i;

// 1. Pecah ekspor chat menjadi pesan (pesan bisa multi-baris).
const msgs = [];
for (const line of readFileSync(input, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const m = MSG_START.exec(line);
  if (m) msgs.push({ date: `20${m[3]}-${m[2]}-${m[1]}`, time: `${m[4]}:${m[5]}`, text: m[6] });
  else if (msgs.length) msgs.at(-1).text += "\n" + line;
}

// 2. Ambil pesan Check In / Check Out.
const reports = [];
for (const { date, time, text } of msgs) {
  const i = text.indexOf(": ");
  if (i < 0) continue; // pesan sistem
  const sender = text.slice(0, i), body = text.slice(i + 2);
  const lines = body.split("\n").map((l) => l.replace(/\*/g, "").trim()).filter(Boolean);
  const kind = lines[0] && KIND.exec(lines[0]);
  if (!kind) continue;
  const raw = lines[1] || "(tanpa nama unit)";
  const unit = ALIAS[raw.toLowerCase()] || raw;
  reports.push({ date, time, sender, unit, type: kind[1].toLowerCase() === "in" ? "IN" : "OUT", body });
}
reports.forEach((r, i) => (r.id = i));
if (!reports.length) { console.error("Tidak ada pesan Check In/Out ditemukan."); process.exit(1); }

// 3. Rekap per unit per hari kerja (hari yang ada laporan sama sekali).
const days = [...new Set(reports.map((r) => r.date))].sort();
const units = [...new Set(reports.map((r) => r.unit))].sort();
const cell = new Map(); // "unit|tanggal" -> { in, out, pelapor }
for (const r of reports) {
  const c = cell.get(`${r.unit}|${r.date}`) || { in: null, out: null, sender: r.sender };
  if (r.type === "IN" && (!c.in || r.time < c.in)) c.in = r.time;
  if (r.type === "OUT" && (!c.out || r.time > c.out)) c.out = r.time;
  cell.set(`${r.unit}|${r.date}`, c);
}
const late = (t, limit, isIn) => limit && t && (isIn ? t > limit : t < limit);
const status = (c) => !c || (!c.in && !c.out) ? "Tidak lapor" : !c.in ? "Belum Check In" : !c.out ? "Belum Check Out" : "Lengkap";
const flag = (c) => [late(c?.in, opt["batas-in"], true) && "In terlambat", late(c?.out, opt["batas-out"], false) && "Out terlalu awal"].filter(Boolean).join(", ");
const fmtDay = (d) => d.split("-").reverse().join("/");
const H = (v) => ({ v, s: STYLE.HEADER });
const color = { Lengkap: STYLE.OK, "Tidak lapor": STYLE.BAD };

const harian = [[H("Tanggal"), H("Unit"), H("Check In"), H("Check Out"), H("Status"), H("Catatan"), H("Pelapor")]];
for (const d of days) for (const u of units) {
  const c = cell.get(`${u}|${d}`), st = status(c), fl = flag(c);
  harian.push([fmtDay(d), u, c?.in || "", c?.out || "", { v: st, s: color[st] || STYLE.WARN }, fl ? { v: fl, s: STYLE.WARN } : "", c?.sender || ""]);
}

const matriks = [[H("Unit"), ...days.map((d) => H(fmtDay(d).slice(0, 5))), H("Lengkap"), H("Tidak lengkap/lapor")]];
for (const u of units) {
  let ok = 0;
  const row = days.map((d) => {
    const c = cell.get(`${u}|${d}`), st = status(c);
    if (st === "Lengkap") ok++;
    return { v: st === "Lengkap" ? "✓" : st === "Tidak lapor" ? "✗" : st === "Belum Check In" ? "Out saja" : "In saja", s: color[st] || STYLE.WARN };
  });
  matriks.push([u, ...row, ok, days.length - ok]);
}

const detail = [[H("Tanggal"), H("Jam"), H("Jenis"), H("Unit"), H("Pelapor"), H("Isi pesan")]];
for (const r of reports) detail.push([fmtDay(r.date), r.time, r.type === "IN" ? "Check In" : "Check Out", r.unit, r.sender, r.body]);

// 4. Nominal (Rp juta) per kategori dari isi laporan, sebelum bagian "Prognosa".
const LABELS = [
  ["BWU Reguler", /^BWU\s*reguler/i], ["BWU Pandu", /^BWU\s*pandu/i], ["BWU Prima", /^BWU\s*prima/i], ["BWU", /^BWU\b/i],
  ["BCM", /^BCM\b/i], ["KUR", /^KUR\b/i], ["KKLK", /^KKLK\b/i], ["KPP", /^KPP\b/i],
  ["Pra NPL", /^pra\s*npl\b/i], ["NPL", /^NPL\b/i], ["HB", /^HB\b/i],
  ["Pelunasan Deb Bisnis", /^pelunasan\s*deb\s*bisnis/i], ["Pelunasan Deb LaR", /^pelunasan\s*deb\s*lar/i],
  ["Downsizing Deb Bisnis", /^downsizing/i], ["Pelunasan", /^pelunasan\b/i],
];
const AMOUNT = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(jt|juta|miliar|m)\b/i;
const AMOUNT_NO_UNIT = /rp\.?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)/i;
const toNumber = (s) => (/^\d{1,3}([.,]\d{3})+$/.test(s) ? parseFloat(s.replace(/[.,]/g, "")) : parseFloat(s.replace(",", ".")));
const toJuta = (s, unit) => toNumber(s) * (/^(m|miliar)$/i.test(unit || "") ? 1000 : 1);
const HEADER = /^(penyelesaian|prognosa|aktivasi|closing|qris|wondr)/i;
const MONTHS = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const reportDate = (lines) => {
  const t = lines.slice(1, 6).join(" ");
  let m = /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i.exec(t);
  if (m) return `${m[1].padStart(2, "0")}/${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}/${m[3]}`;
  m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}` : "";
};

const nominal = []; // { report, kategori, nominal, debitur, ket }
const unread = []; // baris berisi angka yang tidak dikenali, untuk dicek manual
for (const r of reports) {
  const lines = r.body.split("\n").map((l) => l.replace(/[*\u2060\u200e\u200f]/g, "").trim()).filter(Boolean);
  r.tglLaporan = reportDate(lines);
  let cur = null;
  for (const raw of lines.slice(2)) {
    const line = raw.replace(/^[^A-Za-z]+/, "");
    if (/prognosa/i.test(line)) break;
    const hit = LABELS.find(([, re]) => re.test(line));
    if (hit) {
      cur = null;
      const rest = line.replace(hit[1], "").replace(/^\s*[:;]?\s*/, "");
      const head = rest.split("(")[0];
      const a = AMOUNT.exec(head), b = !a && AMOUNT_NO_UNIT.exec(head);
      if (!a && !b) { if (/\d/.test(head)) unread.push([r, line]); continue; }
      const value = a ? toJuta(a[1], a[2]) : toNumber(b[1]);
      if (!value) continue;
      const deb = /\(\s*(\d+)\s*deb/i.exec(rest);
      const ket = rest.replace(/^[^)]*\)?/, "").replace(/^[\s/]+/, "");
      cur = { report: r, kategori: hit[0], nominal: value, debitur: deb ? +deb[1] : "", ket };
      nominal.push(cur);
    } else if (cur && !HEADER.test(line) && /[\/\d]/.test(line)) {
      cur.ket = cur.ket ? `${cur.ket} ; ${line}` : line; // rincian debitur di baris bawahnya
    } else {
      if (HEADER.test(line)) cur = null;
      if (AMOUNT.test(line) && !HEADER.test(line)) unread.push([r, line]);
    }
  }
}
// Jika satu unit mengirim Check In/Out lebih dari sekali dalam sehari, hanya yang terakhir dihitung di Total.
const latest = new Map();
for (const r of reports) {
  const k = `${r.unit}|${r.date}|${r.type}`;
  if (!latest.has(k) || r.time >= latest.get(k).time) latest.set(k, r);
}
const used = (r) => latest.get(`${r.unit}|${r.date}|${r.type}`) === r;

const CATS = ["BCM", "BWU", "KUR", "KKLK", "KPP", "Pra NPL", "NPL", "HB", "Pelunasan", "Downsizing Deb Bisnis"];
const catTotals = (rows) => { // BWU dan Pelunasan: pakai baris induk bila ada, kalau tidak jumlah rinciannya (tanpa hitung ganda)
  const by = {};
  for (const x of rows) by[x.kategori] = (by[x.kategori] || 0) + x.nominal;
  const t = { ...by };
  t.BWU = by.BWU || (by["BWU Reguler"] || 0) + (by["BWU Pandu"] || 0) + (by["BWU Prima"] || 0);
  t.Pelunasan = (by["Pelunasan Deb Bisnis"] || 0) + (by["Pelunasan Deb LaR"] || 0) || by.Pelunasan || 0;
  return t;
};
const byReport = new Map();
for (const x of nominal) if (used(x.report)) byReport.set(x.report, [...(byReport.get(x.report) || []), x]);

const nominalRows = [[H("Tanggal"), H("Tgl di laporan"), H("Jenis"), H("Jam"), H("Unit"), H("Kategori"), H("Nominal (Rp juta)"), H("Debitur"), H("Rincian"), H("Pelapor"), H("Dihitung di Total")]];
for (const x of nominal) nominalRows.push([fmtDay(x.report.date), x.report.tglLaporan, x.report.type === "IN" ? "Check In" : "Check Out", x.report.time, x.report.unit, x.kategori, x.nominal, x.debitur, x.ket, x.report.sender, used(x.report) ? "Ya" : { v: "Tidak (ada laporan lebih baru)", s: STYLE.WARN }]);

const pivotSheet = (name, type, rowKeys, rowOf, label) => {
  const rows = [[H(label), ...CATS.map(H)]], sum = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const key of rowKeys) {
    const t = {};
    for (const [rep, list] of byReport) if (rep.type === type && rowOf(rep) === key) for (const [c, v] of Object.entries(catTotals(list))) t[c] = (t[c] || 0) + v;
    rows.push([label === "Tanggal" ? fmtDay(key) : key, ...CATS.map((c) => { sum[c] += t[c] || 0; return t[c] || ""; })]);
  }
  rows.push([{ v: "TOTAL", s: STYLE.HEADER }, ...CATS.map((c) => ({ v: sum[c], s: STYLE.HEADER }))]);
  return { name, rows, widths: [26, ...CATS.map(() => 14)] };
};
const unreadRows = [[H("Tanggal"), H("Jenis"), H("Unit"), H("Baris yang tidak terbaca (cek manual)")]];
for (const [r, line] of unread) unreadRows.push([fmtDay(r.date), r.type === "IN" ? "Check In" : "Check Out", r.unit, line]);
const amountOf = (text) => { const a = AMOUNT.exec(text), b = !a && AMOUNT_NO_UNIT.exec(text); return a ? toJuta(a[1], a[2]) : b ? toNumber(b[1]) : null; };
const nominalSheets = [
  { name: "Nominal", rows: nominalRows, widths: [12, 13, 11, 8, 26, 22, 17, 9, 60, 24, 24] },
  pivotSheet("Total Check Out", "OUT", units, (r) => r.unit, "Unit"),
  pivotSheet("Total Check In", "IN", units, (r) => r.unit, "Unit"),
  pivotSheet("Per Tanggal (Out)", "OUT", days, (r) => r.date, "Tanggal"),
  { name: "Perlu Dicek", rows: unreadRows, widths: [12, 11, 26, 100] },
];

writeFileSync(output, buildXlsx([
  { name: "Matriks", rows: matriks, widths: [26, ...days.map(() => 7), 9, 20] },
  { name: "Rekap Harian", rows: harian, widths: [12, 26, 10, 10, 16, 20, 26] },
  ...nominalSheets,
  ...rencanaSheets(nominal, reports, used, amountOf, units),
  prognosaSheet(reports, used),
  { name: "Detail Pesan", rows: detail, widths: [12, 8, 11, 26, 26, 90] },
]));
const lengkap = harian.slice(1).filter((r) => r[4].v === "Lengkap").length;
console.log(`${reports.length} pesan Check In/Out | ${units.length} unit | ${days.length} hari (${fmtDay(days[0])}-${fmtDay(days.at(-1))})`);
console.log(`Lengkap ${lengkap} dari ${harian.length - 1} unit-hari. Hasil: ${output}`);
const grand = (type) => { const t = {}; for (const [rep, list] of byReport) if (rep.type === type) for (const [c, v] of Object.entries(catTotals(list))) t[c] = (t[c] || 0) + v; return CATS.filter((c) => t[c]).map((c) => `${c} ${t[c].toLocaleString("id-ID")}`).join(", "); };
console.log(`${unread.length} baris berangka tidak terbaca (sheet "Perlu Dicek")`);
console.log(`${nominal.length} baris nominal (Rp juta). Total Check Out: ${grand("OUT")}`);
