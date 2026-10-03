  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => (n || n === 0) ? "Rp" + Math.round(n).toLocaleString("id-ID") : "—";
  const num = (n) => Math.round(n).toLocaleString("id-ID");

  function mergeCfg(saved) {
    const d = defaultCfg();
    if (!saved || typeof saved !== "object") return d;
    if (saved.ttdJabatan === "HRD" && !saved.ttdNama) { delete saved.ttdJabatan; delete saved.ttdNama; }
    delete saved.izin;
    if (!saved.logo) { delete saved.logo; delete saved.logoW; delete saved.logoH; }
    const c = Object.assign(d, saved);
    c.tarif = (c.tarif || []).map((t) => {
      const x = Object.assign({}, TARIF_KOSONG, t);
      if (t.tunj != null && t.tunjMT == null) x.tunjMT = +t.tunj || 0;
      delete x.tunj; delete x.makan;
      return x;
    });
    ["adj", "pegawai", "bulanan", "invoice", "riwayat", "approval", "penolakan", "backup"].forEach((k) => { if (!c[k] || typeof c[k] !== "object") c[k] = {}; });
    const dsh = Object.fromEntries(d.shifts.map((x) => [x.nama, x]));
    c.shifts = (c.shifts || []).map((x) => (x.nama === "Lapangan 09-16" || x.nama === "Lapangan 09-18") && !x.cabang && dsh[x.nama] && x.masuk === dsh[x.nama].masuk && x.pulang === dsh[x.nama].pulang ? Object.assign({}, x, { cabang: dsh[x.nama].cabang }) : x);
    if (!Array.isArray(c.approvers)) c.approvers = [];
    if (!Array.isArray(c.pegawaiLuar)) c.pegawaiLuar = [];
    delete c.apPinHash;
    const awal = defaultCfg();
    c.dasarHarian = Object.assign({}, awal.dasarHarian, saved.dasarHarian || {});
    c.bpjs = Object.assign({}, awal.bpjs, saved.bpjs || {});
    if (saved.biayaAdmin == null) { const a = c.tarif.map((t) => t.admin).find((x) => isNum(x)); if (a != null) c.biayaAdmin = +a; }
    c.tarif.forEach((t) => { delete t.admin; });
    return c;
  }
  function setSaved(t) { $("#saved").textContent = t; }
  function scheduleSave() {
    if (reviewMode) { setSaved("Mode tinjauan: perubahan tidak disimpan"); return; }
    setSaved("Menyimpan…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const json = JSON.stringify(cfg);
      let ok = false;
      try { localStorage.setItem("rekap-absensi-cfg", json); ok = true; } catch (e) { /* abaikan */ }
      if (dbApi) {
        try { await dbApi.doc("settings/main").set({ json }); ok = true; } catch (e) { /* abaikan */ }
      }
      setSaved(ok ? "Pengaturan tersimpan" : "Pengaturan tidak bisa disimpan di tampilan ini");
    }, 500);
  }
  async function loadCfg() {
    try { const j = localStorage.getItem("rekap-absensi-cfg"); if (j) cfg = mergeCfg(JSON.parse(j)); } catch (e) { /* abaikan */ }
    try {
      dbApi = await window.claude.use("db");
      if (dbApi) {
        const snap = await dbApi.doc("settings/main").get();
        const d = snap && (snap.exists === true || (typeof snap.exists === "function" && snap.exists())) ? (typeof snap.data === "function" ? snap.data() : snap.data) : null;
        if (d && d.json) { cfg = mergeCfg(JSON.parse(d.json)); if (rawRows) { hasil = hitung(rawRows); cekBukti(); } renderAll(); }
      }
    } catch (e) { dbApi = null; }
  }
