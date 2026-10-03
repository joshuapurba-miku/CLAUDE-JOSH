
  // ---------- util tampilan ----------
  const AMBANG_HADIR = 0.85;
  const pct = (x) => (x * 100).toFixed(1).replace(".", ",") + "%";
  const jam = (x) => (Math.round(x * 10) / 10).toLocaleString("id-ID") + " jam";
  const namaPT = () => cfg.perusahaan || perusahaanFile || "Nama perusahaan";
  const sumBy = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const HR = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  function bulanLabel(p) { const [y, m] = p.split("-"); return BLN[+m - 1] + " " + y; }
  function tglPanjang(d) { return d.getDate() + " " + BLN[d.getMonth()] + " " + d.getFullYear(); }
  const tglPendek = (iso) => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1].slice(0, 3);
  const hariDari = (iso) => HR[new Date(iso + "T00:00:00Z").getUTCDay()];
  function branchList() { const s = new Set(cfg.tarif.map((t) => t.cabang)); if (rawRows) rawRows.forEach((r) => s.add(r.cabang)); return [...s].filter(Boolean).sort(); }
  function postList() { const s = new Set(cfg.tarif.map((t) => t.posisi)); if (rawRows) rawRows.forEach((r) => s.add(r.posisi)); return [...s].filter(Boolean).sort(); }
  function dl(id, arr) { return `<datalist id="${id}">${arr.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>`; }
  const POSISI_LABEL = { CSO: "Custodian Service Officer (CSO)", PIC: "Person in Charge (PIC)", MANPOWER: "Manpower" };
  const cabangOpts = (sel, semua) => (semua ? `<option value="">Semua lokasi</option>` : "") + [...new Set(hasil.rekap.map((r) => r.Cabang))].sort().map((c) => `<option${c === sel ? " selected" : ""} value="${esc(c)}">${esc(c)}</option>`).join("");

  // ---------- tab ----------
  const DATA_TABS = { dash: () => renderDash(), rekap: () => renderRekap(), input: () => renderInput(), bk: () => renderBackup(), slip: () => renderSlip() };
  function showTab(name) {
    const allowed = roleTabs();
    if (allowed && !allowed.includes(name)) name = allowed[0];
    currentTab = name;
    document.querySelectorAll("#tabs button").forEach((x) => x.setAttribute("aria-selected", x.dataset.tab === name ? "true" : "false"));
    Object.keys(DATA_TABS).concat(["gaji", "aturan"]).forEach((t) => { $("#tab-" + t).hidden = t !== name; });
    if (DATA_TABS[name]) DATA_TABS[name]();
    if (name === "gaji") renderGaji();
    if (name === "aturan") renderAturan();
  }
  function renderAll() { applyBrand(); applyRoleTabs(); renderBar(); updateTabCounts(); showTab(currentTab); }
  const terkunci = () => !!(hasil && cfg.approval[hasil.periode]);
  function lockBanner() {
    const a = hasil && cfg.approval[hasil.periode];
    return a ? `<div class="banner ok">Gaji ${bulanLabel(hasil.periode)} sudah disetujui oleh <b>${esc(a.oleh)}</b> pada ${esc(a.tanggal)}. Data dikunci; untuk mengubah, buka kunci di tab Slip Gaji.</div>` : "";
  }
  function logoSrc() { return cfg.logo && cfg.logo !== "none" ? cfg.logo : ""; }
  function applyBrand() {
    const img = $("#hdrLogo");
    if (logoSrc()) { img.src = logoSrc(); img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }
  }
  function kunciForm(root) {
    if (!dikunci()) return;
    root.querySelectorAll("input, select, textarea, button").forEach((x) => { if (!x.closest("[data-free]")) x.disabled = true; });
  }
  function recompute(keepInput) {
    if (rawRows) { hasil = hitung(rawRows); simpanRiwayat(); cekBukti(); }
    renderBar(); updateTabCounts();
    if (currentTab === "input" && keepInput) renderInputSummary();
    else if (DATA_TABS[currentTab]) DATA_TABS[currentTab]();
  }
  function updateTabCounts() {
    const set = (tab, n) => {
      const b = $('#tabs button[data-tab="' + tab + '"]');
      const old = b.querySelector(".count"); if (old) old.remove();
      if (n) { const s = document.createElement("span"); s.className = "count"; s.textContent = n; b.appendChild(s); }
    };
    set("rekap", hasil ? hasil.review.length : 0);
    set("gaji", hasil ? new Set(hasil.rekap.filter((r) => !r.adaTarif && r.Hadir > 0).map((r) => r.Cabang + r.Posisi)).size : 0);
  }
  function renderRoleBar() {
    const el = $("#role-bar");
    if (!el) return;
    if (!activeRole) { el.innerHTML = ""; return; }
    const r = ROLES[activeRole];
    const flowSteps = [
      { key: "kepatuhan", label: "1. Validasi Absensi" },
      { key: "operasional", label: "2. Penggajian" },
      { key: "direktur", label: "3. Persetujuan" }
    ];
    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
      ${roleBadgeHTML()}
      <div class="role-flow">${flowSteps.map((s, i) => `${i ? '<span class="arrow">→</span>' : ""}<span class="step-chip${s.key === activeRole ? " active" : ""}">${s.label}</span>`).join("")}</div>
    </div>`;
    const sw = el.querySelector("#role-switch");
    if (sw) sw.onclick = () => rolePickerModal();
  }
  function renderBar() {
    renderRoleBar();
    const el = $("#databar");
    if (!hasil) { el.innerHTML = ""; return; }
    const kor = Object.keys(cfg.adj).filter((k) => k.slice(-10).startsWith(hasil.periode)).length;
    const rv = reviewMode ? `<div class="banner warn" style="margin-bottom:10px"><b>Mode tinjauan approver</b> · paket ${bulanLabel(reviewMode.periode)} dibuat ${esc(new Date(reviewMode.dibuat).toLocaleString("id-ID"))}. ${reviewMode.cocok ? "Data utuh sesuai paket." : "PERINGATAN: data tidak cocok dengan paket."} Perubahan tidak disimpan. Keputusan ada di tab Slip Gaji. <a href="#" id="rv-keluar">Keluar dari mode tinjauan</a></div>` : "";
    el.innerHTML = rv + `<div class="databar"><div class="meta"><b>${bulanLabel(hasil.periode)}</b> <span class="sub">· ${esc(namaPT())} · ${hasil.rekap.length} pegawai · ${hasil.dari} s/d ${hasil.sampai}${kor ? ` · ${kor} koreksi manual` : ""}</span><div class="hint">${esc(fileName)}</div></div>
      <div class="row"><button class="btn ghost small" id="ganti">Ganti file</button><button class="btn small" id="unduh">Unduh Excel</button></div></div>`;
    $("#ganti").onclick = () => $("#file").click();
    if ($("#rv-keluar")) $("#rv-keluar").onclick = (e) => { e.preventDefault(); location.reload(); };
    $("#unduh").onclick = unduhExcel;
  }

  // ---------- upload ----------
  function uploadPanel() {
    const nTarif = cfg.tarif.length, isi = cfg.tarif.filter((t) => +t.gaji > 0).length;
    const role = activeRole;
    // Role-specific upload guidance
    if (role === "operasional") {
      return `<div class="stack"><div class="panel"><div class="steps">
        <div class="step"><div class="no">1</div><div><b>Impor data validasi</b><span class="sub">Muat file validasi (.json) dari Admin Kepatuhan yang sudah memvalidasi absensi.</span></div></div>
        <div class="step ${isi ? "done" : ""}"><div class="no">2</div><div><b>Atur komponen gaji</b><span class="sub">${isi} dari ${nTarif} tarif sudah diisi. Atur gaji, lembur, backup, potongan.</span></div></div>
        <div class="step"><div class="no">3</div><div><b>Kirim ke Direktur</b><span class="sub">Ekspor paket persetujuan untuk ditinjau dan ditandatangani Direktur.</span></div></div>
      </div></div>
      <div class="drop" id="drop"><h2>Impor data validasi dari Kepatuhan</h2><p class="sub">File .json dari Admin Kepatuhan & Legal. Atau upload langsung file .xlsx dari HRIS.</p>
        <div class="row" style="gap:8px"><button class="btn" id="pick-val">Pilih file validasi (.json)</button><button class="btn ghost" id="pick">atau upload .xlsx langsung</button></div><div id="err"></div></div>
      <input type="file" id="val-file" accept=".json,application/json" hidden></div>`;
    }
    if (role === "direktur") {
      return `<div class="stack"><div class="panel"><div class="steps">
        <div class="step"><div class="no">1</div><div><b>Buka paket persetujuan</b><span class="sub">File .json dari Admin Operasional berisi data gaji yang siap disetujui.</span></div></div>
        <div class="step"><div class="no">2</div><div><b>Tinjau data</b><span class="sub">Periksa rekap gaji, lalu setujui atau tolak.</span></div></div>
        <div class="step"><div class="no">3</div><div><b>Tanda tangan</b><span class="sub">Tanda tangan digital Anda otomatis masuk ke semua slip gaji.</span></div></div>
      </div></div>
      <div class="drop" id="drop"><h2>Buka paket persetujuan</h2><p class="sub">File .json dari Admin Operasional. Tinjau data gaji dan berikan persetujuan.</p>
        <button class="btn" id="pkg-buka">Pilih file persetujuan (.json)</button><div id="err"></div></div>
      <input type="file" id="pkg-file" accept=".json,application/json" hidden></div>`;
    }
    // Default / kepatuhan
    return `<div class="stack"><div class="panel"><div class="steps">
      <div class="step ${isi ? "done" : ""}"><div class="no">1</div><div><b>Isi tarif gaji</b><span class="sub">${isi} dari ${nTarif} kombinasi lokasi + posisi sudah diisi. <a href="#" data-go="gaji">Buka Tarif Gaji</a></span></div></div>
      <div class="step"><div class="no">2</div><div><b>Upload export bulan ini</b><span class="sub">Absensi dihitung otomatis, termasuk shift yang berubah.</span></div></div>
      <div class="step"><div class="no">3</div><div><b>Validasi absensi</b><span class="sub">Cek kehadiran, koreksi yang salah, lalu ekspor data validasi untuk Admin Operasional.</span></div></div>
    </div></div>
    <div class="drop" id="drop"><h2>Upload export absensi dari HRIS</h2><p class="sub">File .xlsx persis seperti hasil download. Data dihitung di browser Anda dan tidak dikirim ke mana pun.</p>
      <button class="btn" id="pick">Pilih file .xlsx</button><p class="hint">atau tarik file ke kotak ini</p><div id="err"></div></div>
    ${!role || role === "kepatuhan" ? "" : '<div class="panel row between"><div><h3>Anda approver?</h3><p class="sub">Buka paket persetujuan (.json) yang dikirim penyiap gaji untuk meninjau dan menyetujui.</p></div><button class="btn ghost" id="pkg-buka">Buka paket persetujuan</button><input type="file" id="pkg-file" accept=".json,application/json" hidden></div>'}</div>`;
  }
  function bindUpload(root) {
    root.querySelectorAll("[data-go]").forEach((a) => a.onclick = (e) => { e.preventDefault(); showTab(a.dataset.go); });
    const pb = root.querySelector("#pkg-buka");
    if (pb) { pb.onclick = () => root.querySelector("#pkg-file").click(); root.querySelector("#pkg-file").onchange = (e) => { if (e.target.files[0]) bukaPaket(e.target.files[0]); }; }
    const pv = root.querySelector("#pick-val");
    if (pv) { pv.onclick = () => root.querySelector("#val-file").click(); root.querySelector("#val-file").onchange = (e) => { if (e.target.files[0]) imporValidasi(e.target.files[0]); }; }
    const drop = root.querySelector("#drop");
    if (!drop) return;
    root.querySelector("#pick").onclick = () => $("#file").click();
    ["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (ev) => { const f = ev.dataTransfer.files[0]; if (f) muat(f); });
  }
  async function muat(f) {
    try {
      if (typeof XLSX === "undefined") throw new Error("Pembaca Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: true });
      rawRows = normalisasi(json);
      fileName = f.name;
      perusahaanFile = (rawRows.find((r) => r.pt) || {}).pt || "";
      let baru = 0;
      rawRows.forEach((r) => { if (!tarifRow(r.cabang, r.posisi)) { cfg.tarif.push(Object.assign({ cabang: r.cabang, posisi: r.posisi }, TARIF_KOSONG)); baru++; } });
      if (baru) scheduleSave();
      hasil = hitung(rawRows); simpanRiwayat(); cekBukti();
      rekapCabang = ""; inputKey = ""; filterCari = slipCari = ""; slipCabang = ""; terbuka.clear();
      renderBar(); updateTabCounts(); showTab("dash");
    } catch (e) {
      const err = $("#err");
      if (err) err.innerHTML = '<div class="banner bad">' + esc(e.message || e) + "</div>"; else setSaved(e.message || String(e));
    }
  }
  function kosong(teks) {
    return `<div class="panel empty"><p>${teks}</p><p style="margin-top:10px"><button class="btn" data-go="dash">Upload file di Dashboard</button></p></div>`;
  }

  // ---------- tab Rekap Absensi ----------
  let rekapMode = "lokasi", rekapCabang = "", filterCari = "", filterCabang = "", terbuka = new Set();
  const KODE_KET = [["H", "Hadir"], ["T", `Telat > ${"{a}"} mnt`], ["A", "Tanpa keterangan"], ["I", "Izin"], ["S", "Sakit"], ["C", "Cuti"], ["O", "Off / tidak ada order"]];
  function legendaKode() {
    return `<div class="keys">${KODE_KET.map(([k, l]) => `<span><span class="cell ${k}">${k === "O" ? "·" : k}</span>${l.replace("{a}", cfg.telatAmbang)}</span>`).join("")}
      <span><span class="cell H adj">H</span>sudah dikoreksi</span><span><span class="cell H rev">H</span>perlu dicek</span><span><span class="cell A bk">A</span>dibackup orang lain</span></div>`;
  }
  function tipHari(d) {
    const p = [`${d.Hari} ${tglPendek(d.Tanggal)}`, STATUS_LABEL[d.Status]];
    if (d["Check In"]) p.push(`${d["Check In"].slice(0, 5)}–${(d["Check Out"] || "?").slice(0, 5)} (shift ${d["Shift Aktual"]})`);
    if (d["Telat (mnt)"]) p.push(`telat ${d["Telat (mnt)"]} mnt`);
    if (d["Lembur Dibayar (jam)"]) p.push(`lembur ${d["Lembur Dibayar (jam)"]} jam`);
    if (d._review.length) p.push("perlu dicek: " + d._review.join("; "));
    if (d.adj) p.push("dikoreksi" + (d.adj.ket ? ": " + d.adj.ket : ""));
    if (d.dibackup) p.push("dibackup oleh " + d.dibackup.join(", "));
    return p.join(" · ");
  }
  function cellHTML(d) {
    return `<button class="cell ${d.Kode}${d.adj ? " adj" : ""}${d.dibackup ? " bk" : ""}${d._review.length ? " rev" : ""}" data-k="${esc(d.key)}" data-t="${d.Tanggal}" data-tip="${esc(tipHari(d))}" aria-label="${esc(d.Nama + ", " + tipHari(d))}">${d.Kode === "O" ? "·" : d.Kode}</button>`;
  }
  function renderRekap() {
    const el = $("#tab-rekap");
    if (!hasil) { el.innerHTML = kosong("Belum ada data. Upload export absensi dulu."); bindUpload(el); return; }
    let h = `<div class="stack"><div class="panel"><div class="row between"><div><h2>Rekap absensi ${bulanLabel(hasil.periode)}</h2>
      <p class="sub">Klik kotak tanggal atau tombol Koreksi untuk mengubah status, menit telat, atau jam lembur. Gaji dan slip langsung ikut berubah.</p></div>
      <div class="seg" role="group" aria-label="Tampilan rekap"><button data-mode="lokasi" aria-pressed="${rekapMode === "lokasi"}">Kode per lokasi</button><button data-mode="jam" aria-pressed="${rekapMode === "jam"}">Jam masuk &amp; pulang</button><button data-mode="pegawai" aria-pressed="${rekapMode === "pegawai"}">Per pegawai</button></div></div>
      <div style="margin-top:12px">${rekapMode === "jam" ? legendaJam() : legendaKode()}</div></div>`;
    h += lockBanner();
    h += rekapMode === "lokasi" ? rekapLokasiHTML() : rekapMode === "jam" ? rekapJamHTML() : rekapPegawaiHTML();
    el.innerHTML = h + "</div>";
    el.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => { rekapMode = b.dataset.mode; renderRekap(); });
    el.querySelectorAll("[data-k][data-t]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); bukaKoreksi(b.dataset.k, b.dataset.t); });
    const sc = $("#rcab"); if (sc) sc.onchange = (e) => { rekapCabang = e.target.value; renderRekap(); };
    const jc = $("#jcab"); if (jc) jc.onchange = (e) => { jamCabang = e.target.value; renderRekap(); };
    const fc = $("#fcab"); if (fc) fc.onchange = (e) => { filterCabang = e.target.value; renderRekap(); };
    const cari = $("#fcari");
    if (cari) cari.oninput = (e) => { filterCari = e.target.value; clearTimeout(cari._t); cari._t = setTimeout(() => { renderRekap(); const n = $("#fcari"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    el.querySelectorAll("tr.emp").forEach((tr) => {
      const toggle = () => { const k = tr.dataset.row; terbuka.has(k) ? terbuka.delete(k) : terbuka.add(k); renderRekap(); };
      tr.onclick = toggle;
      tr.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
    });
    el.querySelectorAll("[data-goemp]").forEach((b) => b.onclick = () => { rekapMode = "pegawai"; filterCari = ""; filterCabang = ""; terbuka = new Set([b.dataset.goemp]); renderRekap(); const tr = document.querySelector(`tr.emp[data-row="${CSS.escape(b.dataset.goemp)}"]`); if (tr) tr.scrollIntoView({ block: "start" }); });
    // Ekspor validasi button for kepatuhan role
    if (activeRole === "kepatuhan" && hasil) {
      const expBtn = document.createElement("div");
      expBtn.className = "panel";
      expBtn.style.marginTop = "16px";
      expBtn.innerHTML = `<div class="row between"><div><h3>Selesai validasi?</h3><p class="sub">Ekspor data absensi yang sudah divalidasi untuk dikirim ke Admin Operasional.</p></div><button class="btn" id="ekspor-val">Ekspor data validasi</button></div>`;
      el.querySelector(".stack").appendChild(expBtn);
      $("#ekspor-val").onclick = () => eksporValidasi();
    }
  }

  // ---------- rekap jam masuk & pulang (kalender sebulan) ----------
  let jamCabang = "";
  function hariBulan() {
    const [y, m] = hasil.periode.split("-").map(Number), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => hasil.periode + "-" + String(i + 1).padStart(2, "0"));
  }
  function legendaJam() {
    return `<div class="keys"><span><span class="tm late">09:41</span> masuk terlambat</span><span><span class="tm early">14:10</span> pulang lebih cepat dari shift</span>
      <span><span class="tm ot">20:05</span> lewat jam pulang ≥ ${cfg.lemburMin} mnt</span><span><span class="tm miss">?</span> tidak check-out</span>
      <span><span class="tm abs">A</span> tanpa keterangan</span><span><span class="tm lv">S</span> izin / sakit / cuti</span><span><span class="tm off">off</span> libur / tidak ada order</span><span><span class="tm adj">08:00</span> sudah dikoreksi</span><span><span class="tm abs bk">A</span> dibackup orang lain</span></div>`;
  }
  function jamCell(d, jenis) {
    if (!d) return "";
    const base = `data-k="${esc(d.key)}" data-t="${d.Tanggal}" data-tip="${esc(tipHari(d))}"`;
    const adj = (d.adj ? " adj" : "") + (d.dibackup ? " bk" : "");
    if (d.Status === "Off") return `<button class="tm off${adj}" ${base} aria-label="${esc(d.Nama)} ${d.Tanggal} libur">off</button>`;
    if (d.Status === "Absent") return `<button class="tm abs${adj}" ${base}>A</button>`;
    if (d.Status !== "Present") return `<button class="tm lv${adj}" ${base}>${d.Kode}</button>`;
    if (jenis === "in") {
      const t = (d["Check In"] || "").slice(0, 5) || "—";
      return `<button class="tm${d["Telat (mnt)"] > 0 ? " late" : ""}${adj}" ${base} aria-label="${esc(d.Nama)} masuk ${t}${d["Telat (mnt)"] ? ", telat " + d["Telat (mnt)"] + " menit" : ""}">${t}</button>`;
    }
    if (d.tidakCO || !d["Check Out"]) return `<button class="tm miss${adj}" ${base} aria-label="${esc(d.Nama)} tidak check-out">?</button>`;
    const t = d["Check Out"].slice(0, 5), cls = d["Pulang Cepat (mnt)"] > 0 ? " early" : d["Lembur (mnt)"] >= cfg.lemburMin ? " ot" : "";
    return `<button class="tm${cls}${adj}" ${base} aria-label="${esc(d.Nama)} pulang ${t}${d["Pulang Cepat (mnt)"] ? ", pulang cepat " + d["Pulang Cepat (mnt)"] + " menit" : ""}">${t}</button>`;
  }
  function rekapJamHTML() {
    const cabs = [...new Set(hasil.rekap.filter((r) => !r.Luar).map((r) => r.Cabang))].sort();
    if (jamCabang && !cabs.includes(jamCabang)) jamCabang = "";
    const rk = hasil.rekap.filter((r) => !r.Luar && (!jamCabang || r.Cabang === jamCabang)).sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama));
    const days = hariBulan();
    const headDays = days.map((t) => { const hr = hariDari(t); return `<th class="${hr === "Min" ? "we" : ""}">${+t.slice(8)}<br>${hr.slice(0, 2)}</th>`; }).join("");
    const tabel = (jenis) => {
      let h = `<div class="scroll" style="border:0"><table class="jt"><thead><tr><th style="text-align:left">Pegawai</th>${headDays}${jenis === "in" ? '<th class="sm">Telat</th><th class="sm">Menit</th>' : '<th class="sm">Pulang cepat</th><th class="sm">Tidak CO</th>'}</tr></thead><tbody>`;
      let cab = "";
      rk.forEach((r) => {
        if (!jamCabang && r.Cabang !== cab) { cab = r.Cabang; h += `<tr><td class="nm" colspan="3" style="padding-top:10px"><b>${esc(cab)}</b></td></tr>`; }
        const m = new Map(r.detail.map((d) => [d.Tanggal, d]));
        h += `<tr><td class="nm">${esc(r.Nama)}<br><span class="sub">${esc(r.Jabatan)}</span></td>${days.map((t) => `<td>${jamCell(m.get(t), jenis)}</td>`).join("")}
          ${jenis === "in" ? `<td class="sm">${r.TelatKali ? `<span class="neg">${r.TelatKali}×</span>` : "0"}</td><td class="sm">${r.TelatMnt}</td>` : `<td class="sm">${r.PcKali ? `<span style="color:var(--warn)">${r.PcKali}×</span>` : "0"}</td><td class="sm">${r.TidakCO ? `<span class="neg">${r.TidakCO}</span>` : "0"}</td>`}</tr>`;
      });
      return h + "</tbody></table></div>";
    };
    return `<div class="panel stack"><div class="row between"><div class="row"><label class="sub" for="jcab">Lokasi</label><select id="jcab" style="width:auto"><option value="">Semua lokasi</option>${cabs.map((c) => `<option${c === jamCabang ? " selected" : ""} value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
      <span class="hint">Telat dan pulang cepat dihitung dari shift yang benar-benar dijalankan. Klik jam untuk mengoreksi.</span></div>
      <div><h3>Check-in (jam masuk)</h3>${tabel("in")}</div><div><h3>Check-out (jam pulang)</h3>${tabel("out")}</div></div>`;
  }
  function rekapLokasiHTML() {
    const cabs = [...new Set(hasil.rekap.filter((r) => !r.Luar).map((r) => r.Cabang))].sort();
    if (!cabs.includes(rekapCabang)) rekapCabang = cabs[0];
    const rk = hasil.rekap.filter((r) => !r.Luar && r.Cabang === rekapCabang).sort((a, b) => a.Nama.localeCompare(b.Nama));
    const hadir = sumBy(rk, (r) => r.Hadir), terj = sumBy(rk, (r) => r.Terjadwal);
    const days = hasil.tanggal;
    let h = `<div class="panel stack"><div class="row between"><div class="row"><label class="sub" for="rcab">Lokasi</label><select id="rcab" style="width:auto">${cabangOpts(rekapCabang)}</select></div>
      <div class="row sub"><span><b>${rk.length}</b> pegawai</span><span>kehadiran <b>${pct(terj ? hadir / terj : 0)}</b></span><span><b>${sumBy(rk, (r) => r.TelatKenaKali)}</b>× telat dipotong</span><span><b>${sumBy(rk, (r) => r.Absen)}</b> hari tanpa keterangan</span></div></div>`;
    h += `<div class="scroll" style="border:0"><table class="cal"><thead><tr><th style="text-align:left">Pegawai</th>${days.map((t) => { const hr = hariDari(t); return `<th class="${hr === "Min" ? "we" : ""}">${+t.slice(8)}<br>${hr.slice(0, 2)}</th>`; }).join("")}
      <th class="sm">H</th><th class="sm">T</th><th class="sm">A</th><th class="sm">I/S/C</th><th class="sm">O</th><th class="sm">Telat</th><th class="sm">Pot. telat</th><th class="sm">Lembur</th></tr></thead><tbody>`;
    rk.forEach((r) => {
      const map = new Map(r.detail.map((d) => [d.Tanggal, d]));
      h += `<tr><td class="nm"><b>${esc(r.Nama)}</b><span class="sub">${esc(r.Jabatan)}</span></td>${days.map((t) => `<td>${map.has(t) ? cellHTML(map.get(t)) : ""}</td>`).join("")}
        <td class="sm">${r.Hadir - r.TelatKenaKali}</td><td class="sm">${r.TelatKenaKali}</td><td class="sm">${r.Absen ? `<span class="neg">${r.Absen}</span>` : 0}</td><td class="sm">${r.Izin + r.Sakit + r.Cuti}</td><td class="sm">${r.Off}</td>
        <td class="sm">${r.TelatMnt} mnt</td><td class="sm">${r.TelatPot ? rp(r.TelatPot) : "—"}</td><td class="sm">${r.LemburJam ? jam(r.LemburJam) : "—"}</td></tr>`;
    });
    h += "</tbody></table></div>";
    const rv = hasil.review.filter((v) => v.Cabang === rekapCabang && v.Tanggal);
    h += `<div><h3>Perlu dicek di lokasi ini (${rv.length})</h3>` + (rv.length ? `<div class="scroll" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Masuk</th><th>Pulang</th><th>Alasan</th><th></th></tr></thead><tbody>${rv.map((v) => `<tr><td>${tglPendek(v.Tanggal)}</td><td>${esc(v.Nama)}</td><td>${esc(v["Check In"])}</td><td>${esc(v["Check Out"])}</td><td class="wrap">${esc(v.Alasan)}</td><td><button class="btn ghost small" data-k="${esc(v.key)}" data-t="${v.Tanggal}">Koreksi</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="hint" style="margin-top:4px">Tidak ada.</p>') + "</div>";
    return h + "</div>";
  }
  function rekapPegawaiHTML() {
    const rk = hasil.rekap.filter((r) => (!filterCabang || r.Cabang === filterCabang) && (!filterCari || (r.Nama + " " + r.NIP).toLowerCase().includes(filterCari.toLowerCase())));
    const tot = (k) => sumBy(rk, (r) => r[k]);
    let h = `<div class="filters"><div class="row"><select id="fcab" aria-label="Filter lokasi">${cabangOpts(filterCabang, true)}</select>
      <input type="text" id="fcari" placeholder="Cari nama / NIP" value="${esc(filterCari)}" aria-label="Cari pegawai"></div><span class="hint">Klik baris untuk melihat dan mengoreksi absensi harian.</span></div>`;
    h += `<div class="scroll"><table><thead><tr><th>Pegawai</th><th>Lokasi / Posisi</th><th class="n">Hadir</th><th class="n">Telat</th><th class="n">Tanpa ket.</th><th class="n">Izin/Sakit/Cuti</th><th class="n">Off</th><th class="n">Tidak check-out</th><th class="n">Lembur</th><th class="n">Pot. telat</th><th class="n">Koreksi</th><th class="n">Gaji diterima</th></tr></thead><tbody>`;
    if (!rk.length) h += '<tr><td colspan="12" class="empty">Tidak ada pegawai yang cocok.</td></tr>';
    rk.forEach((r) => {
      const open = terbuka.has(r.key);
      h += `<tr class="emp" data-row="${esc(r.key)}" tabindex="0" aria-expanded="${open}"><td><b>${esc(r.Nama)}</b><br><span class="sub">${esc(r.NIP || "NIP kosong")}</span></td>
        <td class="wrap">${esc(r.Cabang)}<br><span class="sub">${esc(r.Jabatan)}</span></td>
        <td class="n">${r.Hadir}/${r.Terjadwal}</td><td class="n">${r.TelatKali}×<br><span class="sub">${r.TelatMnt} mnt</span></td>
        <td class="n">${r.Absen ? `<span class="neg">${r.Absen}</span>` : 0}</td><td class="n">${r.Izin}/${r.Sakit}/${r.Cuti}</td><td class="n">${r.Off}</td><td class="n">${r.TidakCO}</td>
        <td class="n">${r.LemburJam ? jam(r.LemburJam) : "—"}</td><td class="n">${r.TelatPot ? rp(r.TelatPot) : "—"}</td><td class="n">${r.Dikoreksi || "—"}</td>
        <td class="n"><b>${r.GajiBersih == null ? '<span class="pill warn">tarif kosong</span>' : rp(r.GajiBersih)}</b></td></tr>`;
      if (open) h += `<tr class="detail"><td colspan="12">${detailTabel(r)}</td></tr>`;
    });
    h += `<tr class="tot"><td colspan="2">Total${filterCabang || filterCari ? " (terfilter)" : ""}</td><td class="n">${num(tot("Hadir"))}</td><td class="n">${num(tot("TelatKali"))}×</td><td class="n">${num(tot("Absen"))}</td><td class="n">${num(tot("Izin") + tot("Sakit") + tot("Cuti"))}</td><td class="n">${num(tot("Off"))}</td><td class="n">${num(tot("TidakCO"))}</td><td class="n">${jam(tot("LemburJam"))}</td><td class="n">${rp(tot("TelatPot"))}</td><td class="n">${num(tot("Dikoreksi"))}</td><td class="n">${rp(sumBy(rk, (r) => r.GajiBersih || 0))}</td></tr></tbody></table></div>`;
    const rvAll = hasil.review.filter((v) => !v.Tanggal);
    if (rvAll.length) h += `<div class="panel"><h3>Catatan data pegawai</h3><ul class="sub" style="margin:8px 0 0;padding-left:18px">${rvAll.map((v) => `<li><b>${esc(v.Nama)}</b>: ${esc(v.Alasan)}</li>`).join("")}</ul></div>`;
    return h;
  }
  function detailTabel(r) {
    let h = '<div class="scroll"><table><thead><tr><th>Tanggal</th><th>Status</th><th>Jadwal HRIS</th><th>Shift aktual</th><th>Masuk</th><th>Pulang</th><th class="n">Telat</th><th class="n">Pot. telat</th><th class="n">Pulang cepat</th><th class="n">Lembur</th><th>Catatan</th><th></th></tr></thead><tbody>';
    r.detail.forEach((d) => {
      const pill = { H: "ok", T: "warn", A: "bad" }[d.Kode] || "";
      h += `<tr><td>${d.Hari} ${tglPendek(d.Tanggal)}</td><td><span class="pill ${pill}">${STATUS_LABEL[d.Status]}${d.Kode === "T" ? ", telat" : ""}</span>${d.adj ? ' <span class="pill">dikoreksi</span>' : ""}</td>
        <td>${esc(d["Jadwal HRIS"])}</td><td>${esc(d["Shift Aktual"])}${d["Status Shift"].startsWith("shift berubah") ? ' <span class="pill warn">berubah</span>' : ""}</td><td>${esc(d["Check In"])}</td><td>${esc(d["Check Out"])}</td>
        <td class="n">${d["Telat (mnt)"] || ""}</td><td class="n">${d["Potongan Telat (Rp)"] ? rp(d["Potongan Telat (Rp)"]) : ""}</td><td class="n">${d["Pulang Cepat (mnt)"] || ""}</td>
        <td class="n">${d["Lembur Dibayar (jam)"] ? jam(d["Lembur Dibayar (jam)"]) : d["Lembur (mnt)"] >= cfg.lemburMin ? `<span class="sub">${d["Lembur (mnt)"]} mnt, belum dibayar</span>` : ""}</td>
        <td class="wrap">${esc(d.Catatan.concat(d._review).join("; "))}</td><td><button class="btn ghost small" data-k="${esc(d.key)}" data-t="${d.Tanggal}">Koreksi</button></td></tr>`;
    });
    return h + "</tbody></table></div>";
  }

  // ---------- modal koreksi ----------
  function tutupModal() { $("#modal").innerHTML = ""; document.removeEventListener("keydown", escModal); }
  function escModal(e) { if (e.key === "Escape") tutupModal(); }
  function bukaKoreksi(key, tgl) {
    if (dikunci()) { setSaved(reviewMode ? "Mode tinjauan approver: data hanya bisa dilihat." : "Periode sudah disetujui dan dikunci. Buka kunci di tab Slip Gaji untuk mengoreksi."); return; }
    const d = hasil.det.find((x) => x.key === key && x.Tanggal === tgl);
    if (!d) return;
    const a = d.adj || {}, au = d.auto;
    const tarifL = d.lemburTarif != null ? d.lemburTarif : cfg.tarifLembur;
    const opt = (v, l) => `<option value="${v}"${(a.status || "") === v ? " selected" : ""}>${l}</option>`;
    $("#modal").innerHTML = `<div class="modal" id="mbg"><form class="box" id="mform" aria-labelledby="mtitle">
      <div><h2 id="mtitle">Koreksi absensi</h2><p class="sub">${esc(d.Nama)} · ${esc(d.Cabang)} · ${d.Hari} ${tglPendek(d.Tanggal)} ${hasil.periode.slice(0, 4)}</p></div>
      <div class="facts"><div><span>Status HRIS</span><b>${d.rawStatus === "Present" ? "Hadir" : d.rawStatus === "Absent" ? "Tidak check-in" : "Off"}</b></div><div><span>Jadwal HRIS</span><b>${esc(d["Jadwal HRIS"] || "—")}</b></div>
        <div><span>Shift aktual</span><b>${esc(d["Shift Aktual"] || "—")}</b></div><div><span>Masuk</span><b>${esc(d["Check In"] || "—")}</b></div><div><span>Pulang</span><b>${esc(d["Check Out"] || "—")}</b></div>
        <div><span>Telat (sistem)</span><b>${au.telat} mnt</b></div><div><span>Lewat jam pulang</span><b>${au.lemburMnt} mnt</b></div></div>
      ${d.Catatan.length || d._review.length ? `<p class="hint">${esc(d.Catatan.filter((c) => !c.startsWith("dikoreksi")).concat(d._review).join("; "))}</p>` : ""}
      <div class="field"><label for="m-status">Status hari ini</label><select id="m-status">${opt("", "Otomatis (sistem: " + STATUS_LABEL[au.status] + ")")}${opt("hadir", "Hadir")}${opt("absen", "Tanpa keterangan (dipotong)")}${opt("izin", "Izin (dipotong)")}${opt("sakit", "Sakit (dibayar)")}${opt("cuti", "Cuti (dibayar)")}${opt("off", "Off / libur")}</select></div>
      <div class="grid"><div class="field"><label for="m-telat">Menit telat yang dihitung</label><input type="number" id="m-telat" min="0" inputmode="numeric" value="${isNum(a.telat) ? a.telat : ""}" placeholder="otomatis: ${au.telat}"><span class="hint">Isi 0 untuk memaafkan telat. Telat &gt; ${cfg.telatAmbang} mnt dipotong ${rp(cfg.telatNominal)}.</span></div>
        <div class="field"><label for="m-lembur">Jam lembur dibayar</label><input type="number" id="m-lembur" min="0" step="0.5" value="${isNum(a.lembur) ? a.lembur : ""}" placeholder="otomatis: ${au.lembur}"><span class="hint">Tarif ${rp(tarifL)}/jam${d.lemburTarif != null ? " (aturan lembur lokasi)" : " (tarif lembur bawaan)"}.</span></div></div>
      ${d.tidakCO || a.co ? `<label class="row"><input type="checkbox" id="m-co"${a.co === "ok" ? " checked" : ""}> Check-out sudah dikonfirmasi (tidak dihitung "tidak check-out")</label>` : ""}
      <div class="field"><label for="m-ket">Alasan koreksi</label><input type="text" id="m-ket" value="${esc(a.ket || "")}" placeholder="misal: tukar shift disetujui PIC"></div>
      <div class="row between"><div>${d.adj ? '<button type="button" class="btn ghost" id="m-reset">Kembalikan ke otomatis</button>' : ""}</div>
        <div class="row"><button type="button" class="btn ghost" id="m-batal">Batal</button><button type="submit" class="btn">Simpan koreksi</button></div></div>
    </form></div>`;
    document.addEventListener("keydown", escModal); $("#tip").hidden = true;
    $("#mbg").onclick = (e) => { if (e.target.id === "mbg") tutupModal(); };
    $("#m-batal").onclick = tutupModal;
    const k = key + "|" + tgl;
    if ($("#m-reset")) $("#m-reset").onclick = () => { delete cfg.adj[k]; tutupModal(); scheduleSave(); recompute(); };
    $("#mform").onsubmit = (e) => {
      e.preventDefault();
      const n = {};
      const s = $("#m-status").value, t = $("#m-telat").value, l = $("#m-lembur").value, ket = $("#m-ket").value.trim();
      if (s) n.status = s;
      if (t !== "") n.telat = +t;
      if (l !== "") n.lembur = +l;
      if ($("#m-co") && $("#m-co").checked) n.co = "ok";
      if (Object.keys(n).length) { if (ket) n.ket = ket; cfg.adj[k] = n; } else delete cfg.adj[k];
      tutupModal(); scheduleSave(); recompute();
    };
    $("#m-status").focus();
  }

  // ---------- tab Input Gaji ----------
  let inputKey = "";
  function fieldHTML(scope, key, f, val) {
    const [id, label, type, list] = f;
    const t = type === "text" ? "text" : type === "date" ? "date" : "number";
    return `<div class="field"><label for="in-${scope}-${id}">${label}</label><input type="${t}" id="in-${scope}-${id}" data-scope="${scope}" data-f="${id}" ${list ? `list="${list}"` : ""} ${t === "number" ? 'min="0" step="1000" inputmode="numeric"' : ""} value="${esc(val == null ? "" : val)}"></div>`;
  }
  function renderInput() {
    const el = $("#tab-input");
    if (!hasil) { el.innerHTML = kosong("Komponen gaji diisi per pegawai setelah data absensi diupload."); bindUpload(el); return; }
    const rk = [...hasil.rekap].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama));
    if (!rk.some((r) => r.key === inputKey)) inputKey = rk[0].key;
    const r = rk.find((x) => x.key === inputKey), idx = rk.indexOf(r);
    const P = cfg.pegawai[r.key] || {}, M = bulanIni(r.key), t = tarifRow(r.Cabang, r.Posisi) || TARIF_KOSONG;
    const groups = [...new Set(rk.map((x) => x.Cabang))];
    let h = `<div class="stack"><div class="panel row between"><div class="row"><label class="sub" for="in-emp">Pegawai</label>
      <select id="in-emp" style="width:auto;max-width:100%">${groups.map((g) => `<optgroup label="${esc(g)}">${rk.filter((x) => x.Cabang === g).map((x) => `<option value="${esc(x.key)}"${x.key === inputKey ? " selected" : ""}>${esc(x.Nama)}</option>`).join("")}</optgroup>`).join("")}</select>
      <button class="btn ghost small" id="in-prev" ${idx ? "" : "disabled"}>Sebelumnya</button><button class="btn ghost small" id="in-next" ${idx < rk.length - 1 ? "" : "disabled"}>Berikutnya</button></div>
      <span class="hint">${idx + 1} dari ${rk.length} pegawai · tersimpan otomatis</span></div>`;
    const opsiMassal = F_BULAN.filter((x) => x.sec !== "Masa kerja bulan ini" && x.sec !== "Keterangan di slip").flatMap((x) => x.f.filter((f) => !f[2]).map((f) => `<option value="${f[0]}">${esc(x.sec.replace(/^[A-E]\. /, ""))}: ${esc(f[1])}</option>`)).join("");
    h += `<details class="panel"><summary>Isi sekaligus untuk banyak pegawai (bonus, insentif, potongan)</summary><div class="row" style="margin-top:10px;align-items:flex-end">
      <div class="field"><label for="mb-f">Komponen</label><select id="mb-f">${opsiMassal}</select></div>
      <div class="field"><label for="mb-v">Nilai (Rp)</label><input type="number" id="mb-v" min="0" step="1000" style="width:150px"></div>
      <div class="field"><label for="mb-c">Untuk</label><select id="mb-c"><option value="">Semua pegawai</option>${[...new Set(hasil.rekap.map((x) => x.Cabang))].sort().map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></div>
      <button class="btn" id="mb-go">Terapkan</button></div><p class="hint" id="mb-msg" style="margin-top:6px">Mengganti nilai komponen itu untuk bulan ${bulanLabel(hasil.periode)}. Isi 0 untuk menghapus.</p></details>`;
    h += dl("dl-jab", ["CSO - JUNIOR", "CSO - SENIOR", "PIC - PERCOBAAN", "PIC - JUNIOR", "PIC - SENIOR", "INTERNAL", "MANPOWER"]) + dl("dl-status", ["MITRA KERJA", "PROBATION", "KONTRAK", "PERMANEN"]) + dl("dl-bank", ["BRI", "BNI", "Mandiri", "BCA", "BSI", "BTN", "Bank Sulselbar"]);
    h += `<div class="ig"><div class="stack">
      <div class="panel"><fieldset class="fs"><legend>Data tetap ${esc(r.Nama)} <span class="sub">(berlaku untuk bulan-bulan berikutnya)</span></legend>
        <p class="hint">Tarif ${esc(r.Cabang)} / ${esc(r.Posisi)}: gaji pokok ${rp(t.gaji)}, tunj. makan & transport ${rp(t.tunjMT)}, kinerja ${rp(t.tunjKin)}, absensi ${rp(t.tunjAbs)}. Isi kolom "khusus" hanya jika pegawai ini berbeda dari tarif (misal PIC senior).</p>
        <div class="grid">${F_TETAP.map((f) => fieldHTML("tetap", r.key, f, P[f[0]])).join("")}</div></fieldset></div>`;
    F_BULAN.forEach((s) => {
      h += `<div class="panel"><fieldset class="fs"><legend>${s.sec} <span class="sub">· ${bulanLabel(hasil.periode)}</span></legend>${s.hint ? `<p class="hint">${s.hint}</p>` : ""}<div class="grid">${s.f.map((f) => fieldHTML("bulan", r.key, f, M[f[0]])).join("")}</div></fieldset></div>`;
    });
    h += `</div><div class="panel sumbox" id="in-sum"></div></div>`;
    h += `<div class="stack" style="gap:8px"><h2>Semua pegawai bulan ini</h2><div class="scroll" id="in-all"></div></div></div>`;
    el.innerHTML = lockBanner() + h;
    renderInputSummary();
    $("#in-emp").onchange = (e) => { inputKey = e.target.value; renderInput(); };
    $("#mb-go").onclick = () => {
      const f = $("#mb-f").value, val = +$("#mb-v").value || 0, c = $("#mb-c").value;
      const b = cfg.bulanan[hasil.periode] = cfg.bulanan[hasil.periode] || {};
      const target = hasil.rekap.filter((x) => !c || x.Cabang === c);
      target.forEach((x) => { const o = b[x.key] = b[x.key] || {}; if (val) o[f] = val; else delete o[f]; });
      scheduleSave(); recompute(true); renderInput();
      $("#mb-msg").textContent = `Diterapkan ke ${target.length} pegawai.`; $("#mb-msg").closest("details").open = true;
    };
    $("#in-prev").onclick = () => { inputKey = rk[idx - 1].key; renderInput(); };
    $("#in-next").onclick = () => { inputKey = rk[idx + 1].key; renderInput(); };
    if (dikunci()) { el.querySelectorAll("input[data-scope], #mb-f, #mb-v, #mb-c, #mb-go").forEach((x) => { x.disabled = true; }); }
    el.querySelectorAll("input[data-scope]").forEach((inp) => inp.addEventListener("change", () => {
      const f = inp.dataset.f, val = inp.type === "number" ? (inp.value === "" ? "" : +inp.value) : inp.value.trim();
      let obj;
      if (inp.dataset.scope === "tetap") obj = cfg.pegawai[inputKey] = cfg.pegawai[inputKey] || {};
      else { const b = cfg.bulanan[hasil.periode] = cfg.bulanan[hasil.periode] || {}; obj = b[inputKey] = b[inputKey] || {}; }
      if (val === "") delete obj[f]; else obj[f] = val;
      scheduleSave(); recompute(true);
    }));
  }
  function renderInputSummary() {
    const box = $("#in-sum");
    if (!box || !hasil) return;
    const r = hasil.rekap.find((x) => x.key === inputKey);
    const s = r.slip;
    box.innerHTML = `<h3>${esc(r.Nama)}</h3><p class="sub">${esc(r.Jabatan)} · ${esc(r.Cabang)}</p>
      <p class="hint" style="margin:8px 0">Hadir ${r.Hadir}/${r.Terjadwal} · tanpa ket. ${r.Absen} · izin ${r.Izin} · telat dipotong ${r.TelatKenaKali}× · lembur ${jam(r.LemburJam)}</p>
      ${s.ada ? "" : '<div class="banner warn" style="margin-bottom:8px">Gaji pokok belum ada. Isi di Tarif Gaji atau kolom gaji pokok khusus.</div>'}
      ${s.pend.filter((x) => x.total).map((x) => `<div class="sumline"><span>${esc(x.sec)}</span><span>${rp(x.total)}</span></div>`).join("")}
      <div class="sumline" style="font-weight:700"><span>Pendapatan bruto</span><span>${rp(s.bruto)}</span></div>
      <div class="sumline"><span>Potongan</span><span class="neg">−${rp(s.potongan)}</span></div>
      <div class="sumline big"><span>Gaji diterima</span><span>${s.ada ? rp(Math.max(0, s.thp)) : "—"}</span></div>
      ${r.Minus ? '<p class="hint neg">Potongan melebihi pendapatan; gaji diterima dibulatkan ke Rp0.</p>' : ""}
      <p style="margin-top:12px"><button class="btn ghost small" id="in-lihat">Lihat slip</button></p>`;
    $("#in-lihat").onclick = () => { slipCari = r.Nama; slipCabang = ""; showTab("slip"); };
    const all = $("#in-all");
    const rk = [...hasil.rekap].sort((a, b) => a.Cabang.localeCompare(b.Cabang) || a.Nama.localeCompare(b.Nama));
    all.innerHTML = `<table><thead><tr><th>Pegawai</th><th>Lokasi</th><th>Jabatan</th><th class="n">Pendapatan bruto</th><th class="n">Potongan</th><th class="n">Gaji diterima</th><th></th></tr></thead><tbody>${rk.map((x) => `<tr${x.key === inputKey ? ' style="background:var(--accent-soft)"' : ""}><td>${esc(x.Nama)}</td><td>${esc(x.Cabang)}</td><td>${esc(x.Jabatan)}</td><td class="n">${rp(x.Pendapatan)}</td><td class="n">${rp(x.Potongan)}</td><td class="n"><b>${x.GajiBersih == null ? '<span class="pill warn">tarif kosong</span>' : rp(x.GajiBersih)}</b></td><td><button class="btn ghost small" data-isi="${esc(x.key)}">Isi</button></td></tr>`).join("")}
      <tr class="tot"><td colspan="3">Total</td><td class="n">${rp(sumBy(rk, (x) => x.Pendapatan))}</td><td class="n">${rp(sumBy(rk, (x) => x.Potongan))}</td><td class="n">${rp(sumBy(rk, (x) => x.GajiBersih || 0))}</td><td></td></tr></tbody></table>`;
    all.querySelectorAll("[data-isi]").forEach((b) => b.onclick = () => { inputKey = b.dataset.isi; renderInput(); window.scrollTo({ top: 0 }); });
  }
