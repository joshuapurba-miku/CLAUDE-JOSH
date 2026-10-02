
  // ---------- persetujuan terpisah dengan tanda tangan digital ----------
  // Penyiap mengirim "paket persetujuan" (.json) ke approver. Approver membuka paket di HTML yang sama,
  // meninjau, lalu menyetujui/menolak; keputusannya ditandatangani dengan kunci pribadi approver
  // (ECDSA P-256, hanya tersimpan di laptop approver). Penyiap mengimpor hasilnya: tanda tangan dan
  // sidik data diverifikasi sebelum periode dikunci.
  let reviewMode = null;
  const APPR_KEY = "rekap-approver-kunci";
  const dikunci = () => terkunci() || !!reviewMode;
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const ALG = { name: "ECDSA", namedCurve: "P-256" }, SIG = { name: "ECDSA", hash: "SHA-256" };
  async function sha256(text) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  async function kodeKunci(pub) { return (await sha256(pub.x + "." + pub.y)).slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, "$1-"); }
  function kunciLokal() { try { const j = localStorage.getItem(APPR_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
  async function sidikData() {
    const baris = [...hasil.rekap].sort((a, b) => a.key.localeCompare(b.key)).map((r) => [r.key, Math.round(r.Pendapatan), Math.round(r.Potongan), Math.round(r.GajiBersih || 0)].join("|"));
    return (await sha256(hasil.periode + "\n" + baris.join("\n"))).slice(0, 32);
  }
  const teksTTD = (o) => [o.periode, o.sidik, o.keputusan, o.catatan || "", o.oleh, o.jabatan || "", o.kode, o.waktu].join("\n");

  async function buatKunciApprover(nama, jabatan) {
    const kp = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
    const k = { nama, jabatan, priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: await crypto.subtle.exportKey("jwk", kp.publicKey) };
    k.kode = await kodeKunci(k.pub);
    localStorage.setItem(APPR_KEY, JSON.stringify(k));
    return k;
  }
  async function kirimPaket() {
    const pkg = { jenis: "paket-persetujuan", versi: 1, periode: hasil.periode, dibuat: new Date().toISOString(), fileName, perusahaanFile, sidik: await sidikData(), rows: rawRows, cfg: Object.assign({}, cfg, { approval: {}, penolakan: {} }) };
    await saveFile(`Paket_Persetujuan_${hasil.periode}.json`, JSON.stringify(pkg), "application/json");
    setSaved("Paket terunduh. Kirim file ini ke approver.");
  }
  async function bukaPaket(file) {
    try {
      const pkg = JSON.parse(await file.text());
      if (pkg.jenis !== "paket-persetujuan") throw new Error("Ini bukan paket persetujuan.");
      reviewMode = { periode: pkg.periode, dibuat: pkg.dibuat, sidik: pkg.sidik };
      clearTimeout(saveTimer);
      cfg = mergeCfg(pkg.cfg); rawRows = pkg.rows; fileName = pkg.fileName; perusahaanFile = pkg.perusahaanFile || "";
      hasil = hitung(rawRows);
      reviewMode.cocok = (await sidikData()) === pkg.sidik;
      renderAll(); showTab("dash");
    } catch (e) { setSaved("Paket tidak bisa dibuka: " + (e.message || e)); }
  }
  async function putuskan(keputusan, catatan) {
    const k = kunciLokal();
    if (!k) { setSaved("Buat kunci approver dulu di Aturan."); return; }
    const o = { jenis: "hasil-persetujuan", periode: hasil.periode, sidik: await sidikData(), keputusan, catatan, oleh: k.nama, jabatan: k.jabatan, kode: k.kode, waktu: new Date().toISOString() };
    const key = await crypto.subtle.importKey("jwk", k.priv, ALG, false, ["sign"]);
    o.ttd = b64(await crypto.subtle.sign(SIG, key, new TextEncoder().encode(teksTTD(o))));
    await saveFile(`${keputusan === "setuju" ? "Persetujuan" : "Penolakan"}_${hasil.periode}_${k.nama.replace(/[^\w]+/g, "_")}.json`, JSON.stringify(o, null, 1), "application/json");
    setSaved("Keputusan ditandatangani dan diunduh. Kirim file ini ke penyiap gaji.");
  }
  async function imporKeputusan(file) {
    const msg = (t, ok) => { const el = $("#ap-msg"); if (el) { el.className = "banner " + (ok ? "ok" : "bad"); el.textContent = t; el.hidden = false; } else setSaved(t); };
    try {
      const o = JSON.parse(await file.text());
      if (o.jenis !== "hasil-persetujuan") throw new Error("Ini bukan file hasil persetujuan.");
      const ap = (cfg.approvers || []).find((a) => a.kode === o.kode);
      if (!ap) throw new Error(`Kunci approver ${o.kode} tidak terdaftar. Daftarkan kartu approver di Aturan.`);
      const key = await crypto.subtle.importKey("jwk", ap.pub, ALG, false, ["verify"]);
      if (!(await crypto.subtle.verify(SIG, key, unb64(o.ttd), new TextEncoder().encode(teksTTD(o))))) throw new Error("Tanda tangan digital TIDAK valid. File mungkin diubah.");
      if (o.periode !== hasil.periode) throw new Error(`File ini untuk periode ${bulanLabel(o.periode)}, bukan ${bulanLabel(hasil.periode)}.`);
      if (o.sidik !== (await sidikData())) throw new Error("Data gaji sudah berubah sejak paket dikirim. Kirim paket baru ke approver.");
      const tgl = tglPanjang(new Date(o.waktu));
      if (o.keputusan === "setuju") {
        cfg.approval[hasil.periode] = { oleh: o.oleh, jabatan: o.jabatan, tanggal: tgl, kode: o.kode, digital: true, catatan: o.catatan || "" };
        delete cfg.penolakan[hasil.periode];
      } else {
        cfg.penolakan[hasil.periode] = { oleh: o.oleh, tanggal: tgl, catatan: o.catatan || "" };
      }
      scheduleSave(); renderAll(); showTab("slip");
      msg(o.keputusan === "setuju" ? `Persetujuan ${o.oleh} terverifikasi. Periode dikunci.` : `${o.oleh} menolak: ${o.catatan || "tanpa catatan"}`, o.keputusan === "setuju");
    } catch (e) { msg(e.message || String(e), false); }
  }

  function panelPersetujuan(siap) {
    const ap = cfg.approval[hasil.periode], tolak = cfg.penolakan[hasil.periode], k = kunciLokal();
    if (ap) return `<div class="panel row between"><div><h3>Disetujui${ap.digital ? " · tanda tangan digital terverifikasi" : ""}</h3><p class="sub">Gaji ${bulanLabel(hasil.periode)} disetujui oleh <b>${esc(ap.oleh)}</b>${ap.jabatan ? ` (${esc(ap.jabatan)})` : ""} pada ${esc(ap.tanggal)}${ap.kode ? ` · kode kunci ${esc(ap.kode)}` : ""}.${ap.catatan ? ` Catatan: ${esc(ap.catatan)}` : ""} Data dikunci; slip tidak lagi bertanda DRAFT.</p></div>${reviewMode ? "" : '<button class="btn ghost" id="ap-buka">Batalkan persetujuan</button>'}</div>`;
    if (reviewMode) {
      const cek = reviewMode.cocok ? '<span class="pill ok">data utuh</span>' : '<span class="pill bad">data tidak cocok dengan paket</span>';
      return `<div class="panel stack"><div><h3>Keputusan approver ${cek}</h3><p class="sub">Tinjau Dashboard, Rekap Absensi, dan slip. Keputusan Anda ditandatangani secara digital dengan kunci di laptop ini, lalu diunduh sebagai file untuk dikirim ke penyiap gaji.</p></div>
        ${k ? `<div class="field"><label for="ap-cat">Catatan (wajib jika menolak)</label><input type="text" id="ap-cat" placeholder="misal: lembur RSMH tanggal 23 tolong dicek ulang"></div>
        <div class="row"><span class="sub">Masuk sebagai <b>${esc(k.nama)}</b> · kode ${esc(k.kode)}</span><button class="btn ghost" id="ap-tolak">Tolak</button><button class="btn" id="ap-setuju" ${reviewMode.cocok ? "" : "disabled"}>Setujui &amp; tandatangani</button></div>`
        : '<div class="banner warn">Laptop ini belum punya kunci approver. Buat di tab Aturan → Persetujuan, lalu kirim kartu approver ke penyiap gaji.</div>'}</div>`;
    }
    const daftar = cfg.approvers || [];
    const tolakHTML = tolak ? `<div class="banner bad">Ditolak oleh <b>${esc(tolak.oleh)}</b> pada ${esc(tolak.tanggal)}: ${esc(tolak.catatan || "tanpa catatan")}. Perbaiki lalu kirim paket baru.</div>` : "";
    if (daftar.length) return `<div class="panel stack"><div><h3>Status: Draft · menunggu persetujuan</h3><p class="sub">Approver terdaftar: ${daftar.map((a) => `<b>${esc(a.nama)}</b> (${esc(a.kode)})`).join(", ")}. Langkah: 1) Kirim paket ke approver. 2) Approver membuka paket di file HTML ini dan menyetujui. 3) Impor file hasil persetujuan di sini.</p></div>${tolakHTML}
      <div class="row"><button class="btn ghost" id="ap-kirim" ${siap ? "" : "disabled"}>1. Unduh paket persetujuan</button><button class="btn" id="ap-impor">3. Impor hasil persetujuan</button><input type="file" id="ap-file" accept=".json,application/json" hidden></div><div id="ap-msg" hidden></div></div>`;
    return `<div class="panel row between"><div style="min-width:0;flex:1 1 320px"><h3>Status: Draft</h3><p class="sub">Setujui setelah semuanya dicek. Untuk persetujuan oleh orang lain di laptop berbeda, daftarkan approver di Aturan → Persetujuan.</p></div>${tolakHTML}
      <div class="row"><input type="text" id="ap-oleh" value="${esc(cfg.ttdNama)}" placeholder="Disetujui oleh" aria-label="Disetujui oleh" style="width:200px"><button class="btn" id="ap-kunci" ${siap ? "" : "disabled"}>Setujui &amp; kunci</button></div></div>`;
  }
  function bindPersetujuan() {
    const bk = $("#ap-buka"), kc = $("#ap-kunci");
    if (bk) bk.onclick = () => { if (bk.dataset.armed) { delete cfg.approval[hasil.periode]; scheduleSave(); renderAll(); } else { bk.dataset.armed = "1"; bk.textContent = "Klik lagi: persetujuan batal & perlu disetujui ulang"; } };
    if (kc) kc.onclick = () => {
      const oleh = $("#ap-oleh").value.trim();
      if (!oleh) { $("#ap-oleh").focus(); setSaved("Isi nama yang menyetujui."); return; }
      if (!kc.dataset.armed) { kc.dataset.armed = "1"; kc.textContent = "Klik lagi untuk mengunci"; return; }
      cfg.approval[hasil.periode] = { oleh, tanggal: tglPanjang(new Date()) }; scheduleSave(); renderAll();
    };
    if ($("#ap-kirim")) $("#ap-kirim").onclick = kirimPaket;
    if ($("#ap-impor")) { $("#ap-impor").onclick = () => $("#ap-file").click(); $("#ap-file").onchange = (e) => { if (e.target.files[0]) imporKeputusan(e.target.files[0]); e.target.value = ""; }; }
    if ($("#ap-setuju")) $("#ap-setuju").onclick = () => putuskan("setuju", $("#ap-cat").value.trim());
    if ($("#ap-tolak")) $("#ap-tolak").onclick = () => { const c = $("#ap-cat").value.trim(); if (!c) { $("#ap-cat").focus(); setSaved("Tulis alasan penolakan."); return; } putuskan("tolak", c); };
  }

  // panel di tab Aturan
  function aturanPersetujuanHTML() {
    const k = kunciLokal(), daftar = cfg.approvers || [];
    return `<div class="panel stack" data-free><div><h2>Persetujuan (approver terpisah)</h2><p class="sub">Approver (misal direktur) memakai laptopnya sendiri. Persetujuannya ditandatangani digital, sehingga tidak bisa dibuat-buat oleh penyiap gaji, dan otomatis batal jika data gaji berubah.</p></div>
      <div class="cols2"><div class="stack" style="gap:10px"><h3>Laptop ini sebagai approver</h3>
        ${k ? `<p class="sub">Kunci milik <b>${esc(k.nama)}</b>${k.jabatan ? " · " + esc(k.jabatan) : ""}<br>Kode kunci: <b style="font-family:var(--font-num)">${esc(k.kode)}</b></p>
          <div class="row"><button class="btn ghost" id="ak-kartu">Unduh kartu approver</button><button class="btn ghost" id="ak-hapus">Hapus kunci</button></div>
          <p class="hint">Kirim kartu approver ke penyiap gaji. Kunci pribadi tidak ikut di kartu dan tidak ikut saat ekspor pengaturan.</p>`
        : `<div class="grid"><div class="field"><label for="ak-nama">Nama approver</label><input type="text" id="ak-nama" value="${esc(cfg.ttdNama)}"></div><div class="field"><label for="ak-jab">Jabatan</label><input type="text" id="ak-jab" value="${esc(cfg.ttdJabatan)}"></div></div>
          <div><button class="btn ghost" id="ak-buat">Buat kunci approver di laptop ini</button></div><p class="hint">Hanya dilakukan sekali oleh approver, di laptopnya sendiri.</p>`}</div>
      <div class="stack" style="gap:10px"><h3>Approver terdaftar (di laptop penyiap)</h3>
        ${daftar.length ? `<div class="scroll"><table><thead><tr><th>Nama</th><th>Jabatan</th><th>Kode kunci</th><th></th></tr></thead><tbody>${daftar.map((a, i) => `<tr><td>${esc(a.nama)}</td><td>${esc(a.jabatan || "")}</td><td style="font-family:var(--font-num)">${esc(a.kode)}</td><td><button class="btn ghost small" data-apdel="${i}">Hapus</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="sub">Belum ada. Selama kosong, gaji disetujui langsung di laptop ini.</p>'}
        <div class="row"><button class="btn ghost" id="ak-tambah">Tambah dari kartu approver (.json)</button><input type="file" id="ak-file" accept=".json,application/json" hidden></div>
        <p class="hint">Cocokkan kode kunci dengan approver lewat telepon/WA saat mendaftarkan.</p></div></div></div>`;
  }
  function bindAturanPersetujuan() {
    if ($("#ak-buat")) $("#ak-buat").onclick = async () => {
      const nama = $("#ak-nama").value.trim(); if (!nama) { $("#ak-nama").focus(); return; }
      try { await buatKunciApprover(nama, $("#ak-jab").value.trim()); renderAturan(); } catch (e) { setSaved("Kunci tidak bisa dibuat di browser ini: " + (e.message || e)); }
    };
    if ($("#ak-kartu")) $("#ak-kartu").onclick = () => { const k = kunciLokal(); saveFile(`Kartu_Approver_${k.nama.replace(/[^\w]+/g, "_")}.json`, JSON.stringify({ jenis: "kartu-approver", nama: k.nama, jabatan: k.jabatan, kode: k.kode, pub: k.pub }, null, 1), "application/json"); };
    if ($("#ak-hapus")) $("#ak-hapus").onclick = (e) => { const b = e.target; if (b.dataset.armed) { try { localStorage.removeItem(APPR_KEY); } catch (er) { /* abaikan */ } renderAturan(); } else { b.dataset.armed = "1"; b.textContent = "Klik lagi: kunci hilang permanen"; } };
    if ($("#ak-tambah")) { $("#ak-tambah").onclick = () => $("#ak-file").click(); $("#ak-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const o = JSON.parse(await f.text());
        if (o.jenis !== "kartu-approver" || !o.pub) throw new Error("Bukan kartu approver.");
        o.kode = await kodeKunci(o.pub);
        cfg.approvers = (cfg.approvers || []).filter((a) => a.kode !== o.kode).concat([{ nama: o.nama, jabatan: o.jabatan, kode: o.kode, pub: o.pub }]);
        scheduleSave(); renderAturan();
      } catch (er) { setSaved("Kartu tidak bisa dibaca: " + (er.message || er)); }
    }; }
    document.querySelectorAll("[data-apdel]").forEach((b) => b.onclick = () => { cfg.approvers.splice(+b.dataset.apdel, 1); scheduleSave(); renderAturan(); });
  }
