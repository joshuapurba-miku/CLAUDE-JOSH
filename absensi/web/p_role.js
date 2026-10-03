// ---------- sistem peran (role-based workflow) ----------
  // Peran OTOMATIS ditentukan oleh file yang diupload:
  //   .xlsx dari Kolabo       → Admin Kepatuhan & Legal
  //   .json validasi absensi  → Admin Operasional
  //   .json paket persetujuan → Direktur Operasional
  const ROLES = {
    kepatuhan: {
      label: "Admin Kepatuhan & Legal",
      short: "Kepatuhan",
      icon: "🔍",
      desc: "Upload file .xlsx dari Kolabo untuk memvalidasi absensi.",
      file: "File .xlsx export Kolabo",
      tabs: ["dash", "rekap"]
    },
    operasional: {
      label: "Admin Operasional",
      short: "Operasional",
      icon: "💰",
      desc: "Upload file validasi (.json) dari Admin Kepatuhan untuk mengatur penggajian: tarif gaji, input gaji, lembur, backup, invoice, dan pengaturan.",
      file: "File validasi (.json) dari Kepatuhan",
      tabs: ["dash", "rekap", "input", "bk", "gaji", "slip", "aturan"]
    },
    direktur: {
      label: "Direktur Operasional",
      short: "Direktur",
      icon: "✅",
      desc: "Upload paket persetujuan (.json) dari Admin Operasional untuk ditinjau dan disetujui.",
      file: "Paket persetujuan (.json) dari Operasional",
      tabs: ["dash", "rekap", "slip"]
    }
  };

  let activeRole = null;

  function roleTabs() {
    return activeRole && ROLES[activeRole] ? ROLES[activeRole].tabs : null;
  }

  function applyRoleTabs() {
    const allowed = roleTabs();
    if (!allowed) {
      // no role yet = hide all data tabs, show only dash
      document.querySelectorAll("#tabs button[data-tab]").forEach((b) => { b.hidden = true; });
      return;
    }
    document.querySelectorAll("#tabs button[data-tab]").forEach((b) => {
      const t = b.dataset.tab;
      b.hidden = !allowed.includes(t);
      if (b.getAttribute("aria-selected") === "true" && !allowed.includes(t)) {
        showTab(allowed[0]);
      }
    });
  }

  // Kepatuhan hanya memvalidasi absensi — tidak boleh melihat nominal uang
  function lihatUang() { return activeRole !== "kepatuhan"; }

  function setRoleByFile(r) {
    activeRole = r;
    applyRoleTabs();
    renderAll();
  }

  function roleBadgeHTML() {
    if (!activeRole || !ROLES[activeRole]) return "";
    const r = ROLES[activeRole];
    return `<div class="role-badge" data-free><span class="role-icon">${r.icon}</span><span>${esc(r.label)}</span></div>`;
  }

  // --- Deteksi tipe file JSON ---
  async function deteksiDanMuatJSON(file) {
    try {
      const teks = await file.text();
      const data = JSON.parse(teks);
      if (data.tipe === "validasi-absensi") {
        // File validasi dari Kepatuhan → peran Operasional
        setRoleByFile("operasional");
        await _muatValidasi(data, file.name);
      } else if (data.jenis === "paket-persetujuan") {
        setRoleByFile("direktur");
        await bukaPaket(file);
      } else if (data.jenis === "hasil-persetujuan") {
        if (activeRole !== "operasional" || !hasil) throw new Error("Upload file validasi dari Kepatuhan dulu, lalu impor hasil persetujuan Direktur di tab Slip Gaji.");
        await imporKeputusan(file);
      } else {
        throw new Error("Format file .json tidak dikenali. Gunakan file validasi dari Kepatuhan atau paket persetujuan dari Operasional.");
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setSaved("File bukan JSON yang valid.");
      } else {
        setSaved(e.message || String(e));
      }
    }
  }

  // --- Muat file XLSX → peran Kepatuhan ---
  function setRoleKepatuhan() {
    setRoleByFile("kepatuhan");
  }

  // --- Ekspor data validasi (Kepatuhan → Operasional) ---
  async function eksporValidasi() {
    if (!hasil) return;
    const paket = {
      tipe: "validasi-absensi",
      versi: 1,
      periode: hasil.periode,
      perusahaan: namaPT(),
      dari: hasil.dari,
      sampai: hasil.sampai,
      dibuat: new Date().toISOString(),
      dibuatOleh: "Admin Kepatuhan & Legal",
      fileName: fileName,
      rows: rawRows,
      adj: cfg.adj,
      review: hasil.review,
      sidik: await sidikData()
    };
    const blob = new Blob([JSON.stringify(paket, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Validasi_${hasil.periode}_${namaPT().replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSaved("Data validasi diekspor. Kirim file ini ke Admin Operasional.");
  }

  // --- Impor data validasi (internal, dipanggil setelah deteksi) ---
  async function _muatValidasi(data, namaFile) {
    rawRows = data.rows;
    fileName = data.fileName || namaFile;
    perusahaanFile = data.perusahaan || "";
    if (data.adj) { Object.assign(cfg.adj, data.adj); }
    let baru = 0;
    rawRows.forEach((r) => { if (!tarifRow(r.cabang, r.posisi)) { cfg.tarif.push(Object.assign({ cabang: r.cabang, posisi: r.posisi }, TARIF_KOSONG)); baru++; } });
    if (baru) scheduleSave();
    hasil = hitung(rawRows); simpanRiwayat(); cekBukti();
    rekapCabang = ""; inputKey = ""; filterCari = slipCari = ""; slipCabang = ""; terbuka.clear();
    renderBar(); updateTabCounts(); showTab("dash");
    setSaved(`Data validasi ${bulanLabel(data.periode)} dari Kepatuhan berhasil dimuat. Atur komponen gaji di tab Input Gaji.`);
  }
