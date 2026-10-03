// ---------- sistem peran (role-based workflow) ----------
  const ROLES = {
    kepatuhan: {
      label: "Admin Kepatuhan & Legal",
      short: "Kepatuhan",
      icon: "🔍",
      desc: "Upload data Kolabo, validasi kehadiran, koreksi absensi. Setelah selesai, ekspor data validasi untuk Admin Operasional.",
      tabs: ["dash", "rekap"],
      canUpload: true,
      canExport: true
    },
    operasional: {
      label: "Admin Operasional",
      short: "Operasional",
      icon: "💰",
      desc: "Terima data validasi dari Kepatuhan. Atur komponen gaji: gaji pokok, lembur, backup, tambahan. Setelah selesai, kirim paket persetujuan ke Direktur.",
      tabs: ["dash", "rekap", "input", "bk", "gaji", "aturan"],
      canImportValidasi: true,
      canExportApproval: true
    },
    direktur: {
      label: "Direktur Operasional",
      short: "Direktur",
      icon: "✅",
      desc: "Tinjau dan setujui penggajian. Tanda tangan digital ditambahkan ke slip setelah disetujui.",
      tabs: ["dash", "rekap", "slip"],
      canApprove: true
    }
  };

  const ROLE_KEY = "rekap-peran-aktif";
  let activeRole = null;

  function getRole() {
    try { return localStorage.getItem(ROLE_KEY) || null; } catch (e) { return null; }
  }
  function setRole(r) {
    activeRole = r;
    try { localStorage.setItem(ROLE_KEY, r); } catch (e) { /* ok */ }
  }

  function roleTabs() {
    return activeRole && ROLES[activeRole] ? ROLES[activeRole].tabs : null;
  }

  function applyRoleTabs() {
    const allowed = roleTabs();
    if (!allowed) return; // no role = show all
    document.querySelectorAll("#tabs button[data-tab]").forEach((b) => {
      const t = b.dataset.tab;
      b.hidden = !allowed.includes(t);
      if (b.getAttribute("aria-selected") === "true" && !allowed.includes(t)) {
        showTab(allowed[0]);
      }
    });
  }

  function roleBadgeHTML() {
    if (!activeRole || !ROLES[activeRole]) return "";
    const r = ROLES[activeRole];
    return `<div class="role-badge" data-free><span class="role-icon">${r.icon}</span><span>${esc(r.label)}</span><button class="btn ghost small" id="role-switch" style="margin-left:8px;font-size:12px">Ganti peran</button></div>`;
  }

  function rolePickerModal() {
    const el = $("#modal");
    el.innerHTML = `<div class="m-overlay"><div class="m-box" style="max-width:560px">
      <h2 style="margin-bottom:4px">Pilih peran Anda</h2>
      <p class="sub" style="margin-bottom:16px">Satu file HTML, tiga alur kerja. Pilih sesuai tugas Anda. Data mengalir antar peran lewat file ekspor.</p>
      <div class="role-cards">
        ${Object.entries(ROLES).map(([k, r], i) => `<button class="role-card" data-role="${k}">
          <div class="role-num">${i + 1}</div>
          <div class="role-card-icon">${r.icon}</div>
          <div><b>${esc(r.label)}</b><p class="sub">${esc(r.desc)}</p></div>
        </button>`).join("")}
      </div>
      <p class="hint" style="margin-top:12px;text-align:center">Anda bisa ganti peran kapan saja lewat tombol di header.</p>
    </div></div>`;
    el.querySelectorAll("[data-role]").forEach((b) => b.onclick = () => {
      setRole(b.dataset.role);
      el.innerHTML = "";
      applyRoleTabs();
      renderAll();
    });
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
      fileName: fileName,
      // raw attendance rows
      rows: rawRows,
      // corrections
      adj: cfg.adj,
      // any review notes
      review: hasil.review,
      // sidik (fingerprint)
      sidik: await sidikData()
    };
    const blob = new Blob([JSON.stringify(paket, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Validasi_${hasil.periode}_${namaPT().replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSaved("Data validasi diekspor untuk Admin Operasional.");
  }

  // --- Impor data validasi (Operasional menerima dari Kepatuhan) ---
  async function imporValidasi(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.tipe !== "validasi-absensi") throw new Error("File bukan data validasi absensi.");
      rawRows = data.rows;
      fileName = data.fileName || file.name;
      perusahaanFile = data.perusahaan || "";
      // apply corrections from kepatuhan
      if (data.adj) { Object.assign(cfg.adj, data.adj); }
      // ensure tarif entries exist
      let baru = 0;
      rawRows.forEach((r) => { if (!tarifRow(r.cabang, r.posisi)) { cfg.tarif.push(Object.assign({ cabang: r.cabang, posisi: r.posisi }, TARIF_KOSONG)); baru++; } });
      if (baru) scheduleSave();
      hasil = hitung(rawRows); simpanRiwayat(); cekBukti();
      rekapCabang = ""; inputKey = ""; filterCari = slipCari = ""; slipCabang = ""; terbuka.clear();
      renderBar(); updateTabCounts(); showTab("dash");
      setSaved(`Data validasi ${bulanLabel(data.periode)} dari Kepatuhan berhasil dimuat.`);
    } catch (e) {
      setSaved("Gagal memuat data validasi: " + (e.message || e));
    }
  }

  // Export workflow data (Operasional → Direktur): reuses existing paket persetujuan
  // The existing approval export in p_appr.js already handles this flow.
