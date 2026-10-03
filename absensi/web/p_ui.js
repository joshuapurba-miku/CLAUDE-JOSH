
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
  const DATA_TABS = { dash: () => renderDash(), rekap: () => renderRekap(), input: () => renderInput(), rgaji: () => renderRekapGaji(), bk: () => renderBackup(), slip: () => renderSlip() };
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
    const flowSteps = [
      { key: "operasional", label: "1. Absensi & penggajian" },
      { key: "direktur", label: "2. Persetujuan" }
    ];
    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
      ${roleBadgeHTML()}
      <div class="role-flow">${flowSteps.map((s, i) => `${i ? '<span class="arrow">→</span>' : ""}<span class="step-chip${s.key === activeRole ? " active" : ""}">${s.label}</span>`).join("")}</div>
    </div>`;
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
    return `<div class="stack"><div class="panel">
      <h2 style="margin-bottom:6px">Alur kerja otomatis</h2>
      <p class="sub" style="margin-bottom:14px">Upload file sesuai tugas Anda. Sistem akan otomatis mengenali peran dan membuka tab yang sesuai.</p>
      <div class="role-cards">
        ${Object.entries(ROLES).map(([k, r], i) => `<div class="role-card" style="cursor:default">
          <div class="role-num">${i + 1}</div>
          <div class="role-card-icon">${r.icon}</div>
          <div><b>${esc(r.label)}</b><p class="sub">${esc(r.desc)}</p><p class="hint" style="margin-top:4px">📁 ${esc(r.file)}</p></div>
        </div>`).join("")}
      </div>
    </div>
    <div class="drop" id="drop"><h2>Upload file untuk mulai</h2>
      <p class="sub">Admin Operasional: upload file .xlsx dari Kolabo. Approval: upload paket persetujuan (.json).<br>Akses ditentukan otomatis dari file yang diupload.</p>
      <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center">
        <button class="btn" id="pick">Upload file .xlsx / .json</button>
      </div>
      <p class="hint" style="margin-top:8px">atau tarik file ke kotak ini</p>
      <div id="err"></div>
    </div></div>`;
  }
  function bindUpload(root) {
    root.querySelectorAll("[data-go]").forEach((a) => a.onclick = (e) => { e.preventDefault(); showTab(a.dataset.go); });
    const drop = root.querySelector("#drop");
    if (!drop) return;
    const pick = root.querySelector("#pick");
    if (pick) pick.onclick = () => $("#file").click();
    ["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (ev) => { const f = ev.dataTransfer.files[0]; if (f) muat(f); });
  }
  async function muat(f) {
    try {
      if (f.name.endsWith(".json") || f.type === "application/json") {
        await deteksiDanMuatJSON(f);
        return;
      }
      if (typeof XLSX === "undefined") throw new Error("Pembaca Excel belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: true });
      rawRows = normalisasi(json);
      fileName = f.name;
      perusahaanFile = (rawRows.find((r) => r.pt) || {}).pt || "";
      let baru = 0;
      rawRows.forEach((r) => { if (!tarifRow(r.cabang, r.posisi)) { cfg.tarif.push(Object.assign({ cabang: r.cabang, posisi: r.posisi }, TARIF_KOSONG)); baru++; } });
      if (baru) scheduleSave();
      activeRole = "operasional"; applyRoleTabs();
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
  const KODE_KET = [["H", "Hadir tepat waktu"], ["T", "Hadir tapi telat > {a} mnt"], ["E", "Extend ke shift berikutnya"], ["M", "Masuk di hari off"], ["B", "Backup dari lokasi lain"],
    ["A", "Tanpa keterangan"], ["I", "Izin"], ["S", "Sakit"], ["C", "Cuti"], ["O", "Off / libur"], ["N", "Belum aktif / sudah keluar"]];
  function legendaKode() {
    return `<div class="keys">${KODE_KET.map(([k, l]) => `<span><span class="cell ${k}">${k}</span>${l.replace("{a}", cfg.telatAmbang)}</span>`).join("")}
      <span><span class="cell H adj">H</span>sudah dikoreksi</span><span><span class="cell H rev">H</span>perlu dicek</span><span><span class="cell A bk">A</span>dibackup orang lain</span><span><span class="cell O out">O</span>sedang backup di lokasi lain</span></div>`;
  }
  const isExtend = (d) => d.Status === "Present" && d["Double Shift"] === "ya";
  function tipHari(d) {
    const p = [`${d.Hari} ${tglPendek(d.Tanggal)}`, STATUS_LABEL[d.Status]];
    if (d["Check In"]) p.push(`${d["Check In"].slice(0, 5)}–${(d["Check Out"] || "?").slice(0, 5)}${d["Shift Aktual"] ? ` (shift ${d["Shift Aktual"]})` : ""}`);
    if (d.Extend) p.push("extend ke shift " + d.Extend);
    if (d["Telat (mnt)"]) p.push(`telat ${d["Telat (mnt)"]} mnt`);
    if (d["Lembur Dibayar (jam)"]) p.push(`lembur ${d["Lembur Dibayar (jam)"]} jam`);
    if (d._review.length) p.push("perlu dicek: " + d._review.join("; "));
    if (d.adj) p.push("dikoreksi" + (d.adj.ket ? ": " + d.adj.ket : ""));
    if (d.dibackup) p.push("dibackup oleh " + d.dibackup.join(", "));
    if (d.backupKeluar) p.push("backup di " + d.backupKeluar.map((x) => x.cabang + (x.diganti ? " menggantikan " + x.diganti : "")).join(", "));
    return p.join(" · ");
  }
  function cellHTML(d) {
    const k = isExtend(d) ? "E" : d.Kode;
    return `<button class="cell ${k}${d.adj ? " adj" : ""}${d.dibackup ? " bk" : ""}${d.backupKeluar ? " out" : ""}${d._review.length ? " rev" : ""}" data-k="${esc(d.key)}" data-t="${d.Tanggal}" data-tip="${esc(tipHari(d))}" aria-label="${esc(d.Nama + ", " + tipHari(d))}">${k}</button>`;
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
    el.querySelectorAll("[data-bkgo]").forEach((b) => b.onclick = () => showTab("bk"));
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
  function shiftUtama(r) {
    if (r.TanpaJadwal) return "Sesuai order";
    const hit = {};
    r.detail.forEach((d) => { const sh = d["Shift Aktual"]; if (sh && (d.Status === "Present" || d.Status === "OffMasuk")) hit[sh] = (hit[sh] || 0) + 1; });
    if (!Object.keys(hit).length) r.detail.forEach((d) => { const sh = d["Jadwal HRIS"]; if (sh) hit[sh] = (hit[sh] || 0) + 1; });
    const top = Object.entries(hit).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "Tanpa shift tetap";
  }
  function tabelLokasi(cab, days) {
    const rk = hasil.rekap.filter((r) => !r.Luar && r.Cabang === cab);
    const grup = {};
    rk.forEach((r) => { const sh = shiftUtama(r); (grup[sh] = grup[sh] || []).push(r); });
    const urut = Object.keys(grup).sort((a, b) => (/^\d/.test(a) ? a : "~" + a).localeCompare(/^\d/.test(b) ? b : "~" + b));
    const bk = hasil.backup.filter((o) => o.sev !== "konflik" && o.cabang === cab && o.tgl);
    const per = {};
    bk.forEach((o) => { const p = per[o.pengganti] = per[o.pengganti] || { nama: o.namaPengganti, asal: o.asal, hari: {} }; (p.hari[o.tgl] = p.hari[o.tgl] || []).push(o); });
    const masuk = Object.fromEntries(days.map((t) => [t, 0]));
    const ncol = days.length + 10;
    let h = "";
    urut.forEach((sh) => {
      const rows = grup[sh].sort((a, b) => a.Nama.localeCompare(b.Nama));
      h += `<tr class="grp"><td colspan="${ncol}">${/^\d/.test(sh) ? "Shift " + esc(sh) : esc(sh)} <span>· ${rows.length} orang</span></td></tr>`;
      rows.forEach((r) => {
        const map = new Map(r.detail.map((d) => [d.Tanggal, d]));
        days.forEach((t) => { const d = map.get(t); if (d && (d.Status === "Present" || d.Status === "OffMasuk")) masuk[t]++; });
        h += `<tr><td class="nm"><b>${esc(r.Nama)}${r.Manual ? '<span class="tag">manual</span>' : ""}</b><span class="sub">${esc(r.Jabatan)}</span></td>${days.map((t) => `<td>${map.has(t) ? cellHTML(map.get(t)) : ""}</td>`).join("")}
          <td class="sm">${r.Hadir - r.TelatKenaKali}</td><td class="sm">${r.TelatKenaKali}</td><td class="sm">${r.Absen ? `<span class="neg">${r.Absen}</span>` : 0}</td><td class="sm">${r.Izin + r.Sakit + r.Cuti}</td><td class="sm">${r.Off}</td>
          <td class="sm">${r.Mengganti || "—"}</td><td class="sm">${r.TelatMnt} mnt</td><td class="sm">${r.TelatPot ? rp(r.TelatPot) : "—"}</td><td class="sm">${r.LemburJam ? jam(r.LemburJam) : "—"}</td></tr>`;
      });
    });
    const pk = Object.keys(per);
    if (pk.length) {
      h += `<tr class="grp"><td colspan="${ncol}">Backup dari lokasi lain <span>· ${pk.length} orang</span></td></tr>`;
      pk.forEach((k) => {
        const p = per[k];
        h += `<tr><td class="nm"><b>${esc(p.nama)}<span class="tag">backup</span></b><span class="sub">asal ${esc(p.asal || "di luar Kolabo")}</span></td>${days.map((t) => {
          const os = p.hari[t]; if (!os) return "<td></td>";
          masuk[t]++;
          const tip = `${tglPendek(t)} · backup${os.map((o) => (o.namaDiganti ? " menggantikan " + o.namaDiganti : "") + " · upah " + rp(o.upahPakai)).join(";")}`;
          return `<td><button class="cell B" data-bkgo="1" data-tip="${esc(tip)}" aria-label="${esc(p.nama + ", " + tip)}">B</button></td>`;
        }).join("")}<td class="sm" colspan="5"></td><td class="sm">${Object.keys(p.hari).length}</td><td class="sm" colspan="3"></td></tr>`;
      });
    }
    h += `<tr class="cnt"><td class="nm" style="text-align:left">Masuk per hari</td>${days.map((t) => `<td>${masuk[t]}</td>`).join("")}<td colspan="10"></td></tr>`;
    return { h, n: rk.length, hadir: sumBy(rk, (r) => r.Hadir), terj: sumBy(rk, (r) => r.Terjadwal), telat: sumBy(rk, (r) => r.TelatKenaKali), absen: sumBy(rk, (r) => r.Absen) };
  }
  function rekapLokasiHTML() {
    const cabs = [...new Set(hasil.rekap.filter((r) => !r.Luar).map((r) => r.Cabang))].sort();
    if (rekapCabang !== "*" && !cabs.includes(rekapCabang)) rekapCabang = cabs[0];
    const days = hariBulan(), pilih = rekapCabang === "*" ? cabs : [rekapCabang];
    const head = `<thead><tr><th style="text-align:left">Pegawai</th>${days.map((t) => { const hr = hariDari(t); return `<th class="${hr === "Min" ? "we" : ""}">${+t.slice(8)}<br>${hr.slice(0, 2)}</th>`; }).join("")}
      <th class="sm">H</th><th class="sm">T</th><th class="sm">A</th><th class="sm">I/S/C</th><th class="sm">O</th><th class="sm" title="extend + masuk hari off + backup">Ganti</th><th class="sm">Telat</th><th class="sm">Pot. telat</th><th class="sm">Lembur</th></tr></thead>`;
    let h = `<div class="panel stack"><div class="row between"><div class="row"><label class="sub" for="rcab">Lokasi</label><select id="rcab" style="width:auto"><option value="*"${rekapCabang === "*" ? " selected" : ""}>Semua lokasi</option>${cabangOpts(rekapCabang)}</select></div>
      <span class="hint">Dikelompokkan per shift. Klik kotak untuk mengoreksi; kotak B membuka tab Backup.</span></div>`;
    pilih.forEach((cab) => {
      const t = tabelLokasi(cab, days);
      h += `<div><div class="row between"><h3>${esc(cab)}</h3><div class="row sub"><span><b>${t.n}</b> pegawai</span><span>kehadiran <b>${pct(t.terj ? t.hadir / t.terj : 0)}</b></span><span><b>${t.telat}</b>× telat dipotong</span><span><b>${t.absen}</b> hari tanpa keterangan</span></div></div>
        <div class="scroll" style="border:0"><table class="cal">${head}<tbody>${t.h}</tbody></table></div></div>`;
    });
    const rv = hasil.review.filter((v) => v.Tanggal && pilih.includes(v.Cabang));
    h += `<div><h3>Perlu dicek (${rv.length})</h3>` + (rv.length ? `<div class="scroll" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Lokasi</th><th>Masuk</th><th>Pulang</th><th>Alasan</th><th></th></tr></thead><tbody>${rv.map((v) => `<tr><td>${tglPendek(v.Tanggal)}</td><td>${esc(v.Nama)}</td><td>${esc(v.Cabang)}</td><td>${esc(v["Check In"])}</td><td>${esc(v["Check Out"])}</td><td class="wrap">${esc(v.Alasan)}</td><td>${hasil.det.some((d) => d.key === v.key && d.Tanggal === v.Tanggal) ? `<button class="btn ghost small" data-k="${esc(v.key)}" data-t="${v.Tanggal}">Koreksi</button>` : '<button class="btn ghost small" data-bkgo="1">Backup</button>'}</td></tr>`).join("")}</tbody></table></div>` : '<p class="hint" style="margin-top:4px">Tidak ada.</p>') + "</div>";
    return h + "</div>";
  }
  function rekapPegawaiHTML() {
    const rk = hasil.rekap.filter((r) => (!filterCabang || r.Cabang === filterCabang) && (!filterCari || (r.Nama + " " + r.NIP).toLowerCase().includes(filterCari.toLowerCase())));
    const tot = (k) => sumBy(rk, (r) => r[k]);
    const ncol = 12;
    let h = `<div class="filters"><div class="row"><select id="fcab" aria-label="Filter lokasi">${cabangOpts(filterCabang, true)}</select>
      <input type="text" id="fcari" placeholder="Cari nama / NIP" value="${esc(filterCari)}" aria-label="Cari pegawai"></div><span class="hint">Klik baris untuk melihat dan mengoreksi absensi harian.</span></div>`;
    h += `<div class="scroll"><table><thead><tr><th>Pegawai</th><th>Lokasi / Posisi</th><th class="n">Hadir</th><th class="n">Telat</th><th class="n">Tanpa ket.</th><th class="n">Izin/Sakit/Cuti</th><th class="n">Off</th><th class="n">Tidak check-out</th><th class="n">Lembur</th><th class="n">Pot. telat</th><th class="n">Koreksi</th><th class="n">Gaji diterima</th></tr></thead><tbody>`;
    if (!rk.length) h += '<tr><td colspan="${ncol}" class="empty">Tidak ada pegawai yang cocok.</td></tr>';
    rk.forEach((r) => {
      const open = terbuka.has(r.key);
      h += `<tr class="emp" data-row="${esc(r.key)}" tabindex="0" aria-expanded="${open}"><td><b>${esc(r.Nama)}</b><br><span class="sub">${esc(r.NIP || "NIP kosong")}</span></td>
        <td class="wrap">${esc(r.Cabang)}<br><span class="sub">${esc(r.Jabatan)}</span></td>
        <td class="n">${r.Hadir}/${r.Terjadwal}</td><td class="n">${r.TelatKali}×<br><span class="sub">${r.TelatMnt} mnt</span></td>
        <td class="n">${r.Absen ? `<span class="neg">${r.Absen}</span>` : 0}</td><td class="n">${r.Izin}/${r.Sakit}/${r.Cuti}</td><td class="n">${r.Off}</td><td class="n">${r.TidakCO}</td>
        <td class="n">${r.LemburJam ? jam(r.LemburJam) : "—"}</td><td class="n">${r.TelatPot ? rp(r.TelatPot) : "—"}</td><td class="n">${r.Dikoreksi || "—"}</td>
        <td class="n"><b>${r.GajiBersih == null ? '<span class="pill warn">tarif kosong</span>' : rp(r.GajiBersih)}</b></td></tr>`;
      if (open) h += `<tr class="detail"><td colspan="${ncol}">${detailTabel(r)}</td></tr>`;
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
      <div class="facts"><div><span>${d.manual ? "Status awal" : "Status Kolabo"}</span><b>${d.rawStatus === "Present" ? "Hadir" : d.rawStatus === "Absent" ? "Tidak check-in" : d.rawStatus === "NA" ? "Di luar masa kerja" : d.Status === "OffMasuk" || d.auto.status === "OffMasuk" ? "Off, tapi check-in" : "Off"}</b></div><div><span>Jadwal HRIS</span><b>${esc(d["Jadwal HRIS"] || "—")}</b></div>
        <div><span>Shift aktual</span><b>${esc(d["Shift Aktual"] || "—")}</b></div><div><span>Masuk</span><b>${esc(d["Check In"] || "—")}</b></div><div><span>Pulang</span><b>${esc(d["Check Out"] || "—")}</b></div>
        <div><span>Telat (sistem)</span><b>${au.telat} mnt</b></div><div><span>Lewat jam pulang</span><b>${au.lemburMnt} mnt</b></div></div>
      ${d.Catatan.length || d._review.length ? `<p class="hint">${esc(d.Catatan.filter((c) => !c.startsWith("dikoreksi")).concat(d._review).join("; "))}</p>` : ""}
      <div class="field"><label for="m-status">Status hari ini</label><select id="m-status">${opt("", "Otomatis (sistem: " + STATUS_LABEL[au.status] + ")")}${opt("hadir", "Hadir")}${opt("telat", "Hadir tapi telat")}${opt("absen", "Tanpa keterangan (dipotong)")}${opt("izin", "Izin (dipotong)")}${opt("sakit", "Sakit (dibayar)")}${opt("cuti", "Cuti (dibayar)")}${opt("off", "Off / libur (tidak dibayar ekstra)")}${opt("na", "Belum aktif / sudah keluar (tidak dihitung)")}</select></div>
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
    if (type === "select") return `<div class="field"><label for="in-${scope}-${id}">${label}</label><select id="in-${scope}-${id}" data-scope="${scope}" data-f="${id}">${list.map(([v, l]) => `<option value="${v}"${(val || "") === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
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
        <p class="hint">Tarif ${esc(r.Cabang)} / ${esc(r.Posisi)}: gaji pokok ${rp(t.gaji)}, tunj. makan & transport ${rp(t.tunjMT)}, kinerja ${rp(t.tunjKin)}, kehadiran ${rp(t.tunjAbs)}. Isi kolom "khusus" hanya jika pegawai ini berbeda dari tarif (misal PIC senior).</p>
        <p class="hint">BPJS dihitung dari ${r.slip.bp.base ? rp(r.slip.bp.base) : "UMK (belum diisi di Pengaturan)"}: iuran pegawai Kesehatan ${rp(r.slip.bp.kesPekerja)}, Ketenagakerjaan ${rp(r.slip.bp.tkPekerja)}; bagian perusahaan ${rp(r.slip.bp.kesPerusahaan + r.slip.bp.tkPerusahaan)}. Pilih "dibayar tunai" jika pegawai tidak mau diaktifkan: bagian perusahaan dibayarkan sebagai tambahan gaji.</p>
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
    if (dikunci()) { el.querySelectorAll("input[data-scope], select[data-scope], #mb-f, #mb-v, #mb-c, #mb-go").forEach((x) => { x.disabled = true; }); }
    el.querySelectorAll("input[data-scope], select[data-scope]").forEach((inp) => inp.addEventListener("change", () => {
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
      ${s.faktor < 1 ? `<p class="hint">Prorata: ${esc(s.ketProrata)}</p>` : ""}${s.g.tunjAbs ? `<p class="hint">Tunjangan kehadiran: tepat waktu ${s.tepat}/${s.syarat} hari${s.tepat >= s.syarat ? " ✓" : " (tidak memenuhi)"}</p>` : ""}
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
