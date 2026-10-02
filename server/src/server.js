// Server: webhook WhatsApp (Fonnte) + REST API + dashboard.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dayjs from "dayjs";
import { getState, persist, setState, reseed, uid } from "./store.js";
import { applyCommand } from "./commands.js";
import { calcEmployee, slipText, rekapText, periodeLabel } from "./payroll.js";
import { sendWA, normalizePhone, waEnabled } from "./wa.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

const isAdmin = (phone) => {
  const p = normalizePhone(phone);
  const admins = getState().admins || [];
  if (!admins.length) return true; // belum diatur -> izinkan (mode awal)
  return admins.some((a) => normalizePhone(a.phone) === p);
};

/* ---------------- WEBHOOK WHATSAPP (Fonnte) ---------------- */
// Fonnte mengirim POST (form/JSON) saat ada pesan masuk.
// Field umum: message, sender (chat id), member (pengirim di grup), name.
app.post("/webhook/:secret?", async (req, res) => {
  if (WEBHOOK_SECRET && req.params.secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ status: false, reason: "secret salah" });
  }
  const body = req.body || {};
  const message = body.message || body.text || "";
  const sender = body.sender || body.from || "";       // tujuan balasan
  const senderPerson = body.member || body.sender || ""; // untuk cek admin
  res.json({ status: true }); // balas cepat ke Fonnte

  if (!message || !sender) return;
  try {
    if (!isAdmin(senderPerson)) {
      await sendWA(sender, "Maaf, nomor Anda belum terdaftar sebagai admin. Hubungi pemilik untuk didaftarkan.");
      return;
    }
    const { reply } = applyCommand(message, getState(), dayjs());
    if (reply) await sendWA(sender, reply);
  } catch (err) {
    console.error("Webhook error:", err);
  }
});

/* ---------------- REST API untuk dashboard ---------------- */
app.get("/api/state", (req, res) => res.json(getState()));

app.post("/api/command", (req, res) => {
  const out = applyCommand(req.body.text || "", getState(), dayjs());
  res.json(out);
});

// Lokasi
app.post("/api/locations", (req, res) => {
  const s = getState(); const loc = { id: uid(), shifts: [], ...req.body };
  s.locations.push(loc); persist(); res.json(loc);
});
app.put("/api/locations/:id", (req, res) => {
  const s = getState(); const loc = s.locations.find((l) => l.id === req.params.id);
  if (!loc) return res.status(404).json({ error: "tidak ditemukan" });
  Object.assign(loc, req.body); persist(); res.json(loc);
});
app.delete("/api/locations/:id", (req, res) => {
  const s = getState();
  if (s.employees.some((e) => e.locId === req.params.id))
    return res.status(409).json({ error: "masih ada karyawan di lokasi ini" });
  s.locations = s.locations.filter((l) => l.id !== req.params.id); persist(); res.json({ ok: true });
});

// Karyawan
app.post("/api/employees", (req, res) => {
  const s = getState(); const emp = { id: uid(), tunjangan: 0, potongan: 0, phone: "", ...req.body };
  s.employees.push(emp); persist(); res.json(emp);
});
app.put("/api/employees/:id", (req, res) => {
  const s = getState(); const emp = s.employees.find((e) => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: "tidak ditemukan" });
  Object.assign(emp, req.body); persist(); res.json(emp);
});
app.delete("/api/employees/:id", (req, res) => {
  const s = getState();
  s.employees = s.employees.filter((e) => e.id !== req.params.id);
  for (const k of Object.keys(s.attendance)) if (k.split("|")[0] === req.params.id) delete s.attendance[k];
  persist(); res.json({ ok: true });
});

// Admin (nomor WA yang boleh lapor)
app.post("/api/admins", (req, res) => {
  const s = getState(); s.admins = s.admins || [];
  const a = { nama: req.body.nama || "", phone: normalizePhone(req.body.phone) };
  s.admins.push(a); persist(); res.json(a);
});
app.delete("/api/admins/:phone", (req, res) => {
  const s = getState(); s.admins = (s.admins || []).filter((a) => normalizePhone(a.phone) !== normalizePhone(req.params.phone));
  persist(); res.json({ ok: true });
});

// Absensi
app.put("/api/attendance", (req, res) => {
  const s = getState(); const { empId, date, rec } = req.body;
  s.attendance[empId + "|" + date] = rec; persist(); res.json({ ok: true });
});
app.delete("/api/attendance", (req, res) => {
  const s = getState(); delete s.attendance[req.query.key]; persist(); res.json({ ok: true });
});
app.post("/api/attendance/mark-today", (req, res) => {
  const s = getState(); const d = dayjs().format("YYYY-MM-DD"); let n = 0;
  for (const emp of s.employees) {
    const key = emp.id + "|" + d;
    if (s.attendance[key] && s.attendance[key].status === "hadir") continue;
    const loc = s.locations.find((l) => l.id === emp.locId) || s.locations[0];
    if (!loc) continue;
    const ex = s.attendance[key];
    s.attendance[key] = {
      status: "hadir", locId: ex ? ex.locId : loc.id,
      shift: ex ? ex.shift : (loc.shifts[0] ? loc.shifts[0].nama : ""),
      masuk: ex ? ex.masuk : (loc.shifts[0] ? loc.shifts[0].masuk : ""),
      pulang: ex ? ex.pulang : (loc.shifts[0] ? loc.shifts[0].pulang : ""),
      lembur: ex ? ex.lembur : 0,
    };
    n++;
  }
  persist(); res.json({ ok: true, n });
});

// Gaji & slip
app.get("/api/payroll", (req, res) => {
  const s = getState(); const ym = req.query.month || dayjs().format("YYYY-MM");
  res.json(s.employees.map((e) => calcEmployee(s, e.id, ym)));
});
app.get("/api/slip", (req, res) => {
  const s = getState(); const ym = req.query.month || dayjs().format("YYYY-MM");
  const emp = s.employees.find((e) => e.id === req.query.empId);
  if (!emp) return res.status(404).json({ error: "karyawan tidak ditemukan" });
  res.json({ text: slipText(calcEmployee(s, emp.id, ym), ym) });
});
// Kirim slip ke WhatsApp karyawan
app.post("/api/slip/send", async (req, res) => {
  const s = getState(); const ym = req.body.month || dayjs().format("YYYY-MM");
  const emp = s.employees.find((e) => e.id === req.body.empId);
  if (!emp) return res.status(404).json({ error: "karyawan tidak ditemukan" });
  if (!emp.phone) return res.status(400).json({ error: "nomor WhatsApp karyawan belum diisi" });
  const out = await sendWA(emp.phone, slipText(calcEmployee(s, emp.id, ym), ym));
  res.json({ ok: out.status !== false, mock: !waEnabled(), detail: out });
});

// Backup/restore
app.post("/api/restore", (req, res) => { res.json(setState(req.body)); });
app.post("/api/clear", (req, res) => { res.json(setState({ locations: [], employees: [], admins: [], attendance: {} })); });
app.post("/api/reseed", (req, res) => { res.json(reseed()); });

app.get("/api/health", (req, res) => res.json({ ok: true, waEnabled: waEnabled() }));

app.listen(PORT, () => {
  console.log(`\nRekap Gaji WA berjalan di http://localhost:${PORT}`);
  console.log(`WhatsApp (Fonnte): ${waEnabled() ? "AKTIF" : "mode uji (token belum diisi)"}`);
  console.log(`Webhook: POST /webhook${WEBHOOK_SECRET ? "/" + WEBHOOK_SECRET : ""}\n`);
});
