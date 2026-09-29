#!/usr/bin/env node
// Rekap Check In / Check Out harian dari ekspor chat grup WhatsApp -> Excel.
// Pakai: node rekap-checkin.mjs <chat.txt> [hasil.xlsx] [--batas-in=08:30] [--batas-out=17:00]
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildXlsx, STYLE } from "./xlsx.mjs";

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

writeFileSync(output, buildXlsx([
  { name: "Matriks", rows: matriks, widths: [26, ...days.map(() => 7), 9, 20] },
  { name: "Rekap Harian", rows: harian, widths: [12, 26, 10, 10, 16, 20, 26] },
  { name: "Detail Pesan", rows: detail, widths: [12, 8, 11, 26, 26, 90] },
]));
const lengkap = harian.slice(1).filter((r) => r[4].v === "Lengkap").length;
console.log(`${reports.length} pesan Check In/Out | ${units.length} unit | ${days.length} hari (${fmtDay(days[0])}-${fmtDay(days.at(-1))})`);
console.log(`Lengkap ${lengkap} dari ${harian.length - 1} unit-hari. Hasil: ${output}`);
