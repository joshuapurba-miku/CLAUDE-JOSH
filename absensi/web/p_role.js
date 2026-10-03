// ---------- peran ----------
  // Peran ditentukan oleh file yang diupload:
  //   .xlsx dari Kolabo       → Admin Operasional
  //   .json paket persetujuan → Approval (Direktur)
  const ROLES = {
    operasional: {
      label: "Admin Operasional",
      icon: "💰",
      desc: "Upload file .xlsx dari Kolabo: cek absensi harian, atur gaji, backup, lembur, BPJS, lalu kirim paket persetujuan.",
      file: "File .xlsx export Kolabo",
      tabs: ["dash", "rekap", "input", "rgaji", "bk", "slip", "gaji", "aturan"]
    },
    direktur: {
      label: "Approval (Direktur Operasional)",
      icon: "✅",
      desc: "Upload paket persetujuan (.json) dari Admin Operasional untuk ditinjau, disetujui, dan ditandatangani.",
      file: "Paket persetujuan (.json) dari Admin Operasional",
      tabs: ["dash", "rekap", "rgaji", "slip"]
    }
  };

  let activeRole = null;

  function roleTabs() {
    return activeRole && ROLES[activeRole] ? ROLES[activeRole].tabs : null;
  }

  function applyRoleTabs() {
    const allowed = roleTabs();
    document.querySelectorAll("#tabs button[data-tab]").forEach((b) => {
      const t = b.dataset.tab;
      b.hidden = !allowed || !allowed.includes(t);
      if (allowed && b.getAttribute("aria-selected") === "true" && !allowed.includes(t)) showTab(allowed[0]);
    });
  }

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

  async function deteksiDanMuatJSON(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.jenis === "paket-persetujuan") {
        setRoleByFile("direktur");
        await bukaPaket(file);
      } else if (data.jenis === "hasil-persetujuan") {
        if (activeRole !== "operasional" || !hasil) throw new Error("Upload file .xlsx Kolabo dulu, lalu impor hasil persetujuan Direktur di tab Slip Gaji.");
        await imporKeputusan(file);
      } else {
        throw new Error("Format file .json tidak dikenali. Upload file .xlsx dari Kolabo, atau paket persetujuan dari Admin Operasional.");
      }
    } catch (e) {
      setSaved(e instanceof SyntaxError ? "File bukan JSON yang valid." : e.message || String(e));
    }
  }
