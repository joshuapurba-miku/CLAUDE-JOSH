
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
  const teksTTD = (o) => [o.periode, o.sidik, o.keputusan, o.catatan || "", o.oleh, o.jabatan || "", o.kode, o.waktu, o.ttdHash || ""].join("\n");
  // hasil verifikasi persetujuan per periode: { ok, kodeSlip: {key: kode} }
  const verif = {};
  function ttdValid() { const v = hasil && verif[hasil.periode]; return v && v.ok ? cfg.approval[hasil.periode].bukti.ttdImg || "" : ""; }
  function kodeSlip(r) { const v = hasil && verif[hasil.periode]; return v && v.ok ? (v.kodeSlip[r.key] || "") : ""; }
  async function periksaBukti(ap) {
    const o = ap && ap.bukti;
    if (!o) return false;
    const reg = (cfg.approvers || []).find((a) => a.kode === o.kode);
    if (!reg) return false;
    const key = await crypto.subtle.importKey("jwk", reg.pub, ALG, false, ["verify"]);
    if (!(await crypto.subtle.verify(SIG, key, unb64(o.ttd), new TextEncoder().encode(teksTTD(o))))) return false;
    if (o.ttdImg && (await sha256(o.ttdImg)) !== o.ttdHash) return false;
    return o.periode === hasil.periode && o.sidik === (await sidikData()) && o.keputusan === "setuju";
  }
  async function cekBukti() {
    if (!hasil || !window.crypto || !crypto.subtle) return;
    const p = hasil.periode, ap = cfg.approval[p];
    let hasilCek = { ok: false, kodeSlip: {} };
    try {
      if (await periksaBukti(ap)) {
        hasilCek.ok = true;
        for (const r of hasil.rekap) hasilCek.kodeSlip[r.key] = (await sha256([ap.bukti.ttd, r.NoSlip, r.key, Math.round(r.GajiBersih || 0)].join("|"))).slice(0, 10).toUpperCase().replace(/(.{5})(?=.)/, "$1-");
      }
    } catch (e) { hasilCek.ok = false; }
    const lama = verif[p];
    verif[p] = hasilCek;
    if (!lama || lama.ok !== hasilCek.ok) { if (DATA_TABS[currentTab]) DATA_TABS[currentTab](); }
  }
  function olahTTD(file) {
    return new Promise((ok, gagal) => {
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, 600 / img.width, 300 / img.height), cv = document.createElement("canvas");
          cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
          const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, cv.width, cv.height);
          const d = cx.getImageData(0, 0, cv.width, cv.height), px = d.data;
          let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
          for (let i = 0; i < px.length; i += 4) {
            const g = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) * (px[i + 3] / 255) + 255 * (1 - px[i + 3] / 255);
            let a = Math.max(0, Math.min(1, (205 - g) / 95)); if (a < 0.06) a = 0;
            px[i] = px[i + 1] = px[i + 2] = 0; px[i + 3] = Math.round(a * 255);
            if (a > 0.12) { const p = i / 4, x = p % cv.width, y = Math.floor(p / cv.width); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          if (x1 <= x0) { gagal(new Error("Tanda tangan tidak terdeteksi. Gunakan foto tinta gelap di kertas putih.")); return; }
          cx.putImageData(d, 0, 0);
          const out = document.createElement("canvas"); out.width = x1 - x0 + 12; out.height = y1 - y0 + 12;
          out.getContext("2d").drawImage(cv, x0 - 6, y0 - 6, out.width, out.height, 0, 0, out.width, out.height);
          ok(out.toDataURL("image/png"));
        };
        img.onerror = () => gagal(new Error("File gambar tidak bisa dibaca."));
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }
  let pinMsg = "", pinOk = "";
  const pinHash = (pin) => sha256("rekap-gaji|" + String(pin).trim());
  async function cekPIN(pin) {
    if (!cfg.apPinHash) throw new Error("Buat PIN direktur dulu.");
    if (!String(pin || "").trim()) throw new Error("Isi PIN direktur dulu.");
    if ((await pinHash(pin)) !== cfg.apPinHash) throw new Error("PIN direktur salah. Pastikan tidak ada isian otomatis dari browser; centang \"Tampilkan PIN\" untuk melihat yang diketik.");
    return true;
  }

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
    if (keputusan === "setuju" && k.ttdImg) { o.ttdImg = k.ttdImg; o.ttdHash = await sha256(k.ttdImg); }
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
      if (o.ttdImg && (await sha256(o.ttdImg)) !== o.ttdHash) throw new Error("Gambar tanda tangan tidak cocok dengan tanda tangan digital.");
      const tgl = tglPanjang(new Date(o.waktu));
      if (o.keputusan === "setuju") {
        cfg.approval[hasil.periode] = { oleh: o.oleh, jabatan: o.jabatan, tanggal: tgl, kode: o.kode, digital: true, catatan: o.catatan || "", bukti: o };
        delete cfg.penolakan[hasil.periode];
      } else {
        cfg.penolakan[hasil.periode] = { oleh: o.oleh, tanggal: tgl, catatan: o.catatan || "" };
      }
      scheduleSave(); await cekBukti(); renderAll(); showTab("slip");
      msg(o.keputusan === "setuju" ? `Persetujuan ${o.oleh} terverifikasi. Periode dikunci.` : `${o.oleh} menolak: ${o.catatan || "tanpa catatan"}`, o.keputusan === "setuju");
    } catch (e) { msg(e.message || String(e), false); }
  }

  function panelPersetujuan(siap) {
    const ap = cfg.approval[hasil.periode], tolak = cfg.penolakan[hasil.periode], k = kunciLokal();
    if (ap) return `<div class="panel row between"><div><h3>Disetujui${ttdValid() || (verif[hasil.periode] && verif[hasil.periode].ok) ? " · tanda tangan digital terverifikasi" : ap.digital ? ' · <span class="pill bad">tanda tangan digital tidak valid</span>' : " · tanpa tanda tangan digital (tanda tangan tidak dicetak)"}</h3><p class="sub">Gaji ${bulanLabel(hasil.periode)} disetujui oleh <b>${esc(ap.oleh)}</b>${ap.jabatan ? ` (${esc(ap.jabatan)})` : ""} pada ${esc(ap.tanggal)}${ap.kode ? ` · kode kunci ${esc(ap.kode)}` : ""}.${ap.catatan ? ` Catatan: ${esc(ap.catatan)}` : ""} Data dikunci; slip tidak lagi bertanda DRAFT.</p></div>${reviewMode ? "" : '<button class="btn ghost" id="ap-buka">Batalkan persetujuan</button>'}</div>`;
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
          <div class="row" style="align-items:center">${k.ttdImg ? `<img src="${k.ttdImg}" alt="Tanda tangan" style="height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px">` : '<span class="sub">Belum ada gambar tanda tangan.</span>'}
            <button class="btn ghost" id="ak-ttd">${k.ttdImg ? "Ganti tanda tangan" : "Unggah tanda tangan"}</button><input type="file" id="ak-ttdfile" accept="image/*" hidden></div>
          <p class="hint">Tanda tangan hanya disimpan di laptop ini dan dikirim di dalam file persetujuan yang ditandatangani digital. Tidak tersimpan di file HTML tim, jadi tidak bisa dipakai orang lain.</p>
          <div class="row"><button class="btn ghost" id="ak-kartu">Unduh kartu approver</button><button class="btn ghost" id="ak-hapus">Hapus kunci</button></div>
          <p class="hint">Kirim kartu approver ke penyiap gaji. Kunci pribadi tidak ikut di kartu dan tidak ikut saat ekspor pengaturan.</p>`
        : `<div class="grid"><div class="field"><label for="ak-nama">Nama approver</label><input type="text" id="ak-nama" value="${esc(cfg.ttdNama)}"></div><div class="field"><label for="ak-jab">Jabatan</label><input type="text" id="ak-jab" value="${esc(cfg.ttdJabatan)}"></div></div>
          <div><button class="btn ghost" id="ak-buat">Buat kunci approver di laptop ini</button></div><p class="hint">Hanya dilakukan sekali oleh approver, di laptopnya sendiri.</p>`}</div>
      <div class="stack" style="gap:10px"><h3>Approver terdaftar (di laptop penyiap)</h3>
        ${daftar.length ? `<div class="scroll"><table><thead><tr><th>Nama</th><th>Jabatan</th><th>Kode kunci</th><th></th></tr></thead><tbody>${daftar.map((a, i) => `<tr><td>${esc(a.nama)}</td><td>${esc(a.jabatan || "")}</td><td style="font-family:var(--font-num)">${esc(a.kode)}</td><td><button class="btn ghost small" data-apdel="${i}">Hapus</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="sub">Belum ada. Selama kosong, gaji disetujui langsung di laptop ini.</p>'}
        ${cfg.apPinHash ? `<p class="sub"><span class="pill ok">PIN direktur aktif</span> Menambah atau menghapus approver memerlukan PIN ini.</p>
          <div class="row" style="align-items:flex-end"><div class="field"><label for="ak-pin">PIN direktur</label><input type="password" id="ak-pin" name="ak-pin-rekapgaji" inputmode="numeric" autocomplete="new-password" data-lpignore="true" data-1p-ignore maxlength="8" style="width:150px" placeholder="masukkan PIN"></div>
          <button class="btn ghost" id="ak-tambah">Tambah dari kartu approver (.json)</button><input type="file" id="ak-file" accept=".json,application/json" hidden></div>
          <label class="row hint" style="gap:6px"><input type="checkbox" id="pin-lihat"> Tampilkan PIN</label>
          <p class="hint">Lupa PIN? <button class="btn ghost small" id="pin-reset">Reset PIN</button> Reset menghapus PIN <b>dan semua approver terdaftar</b>; daftarkan ulang bersama direktur.</p>`
        : `<p class="sub"><b>Langkah pertama:</b> direktur membuat PIN di laptop ini. PIN ini dibutuhkan setiap kali daftar approver diubah.</p>
          <div class="row" style="align-items:flex-end"><div class="field"><label for="pin-baru">PIN baru (4–8 angka)</label><input type="password" id="pin-baru" name="pin-baru-rekapgaji" inputmode="numeric" autocomplete="new-password" data-lpignore="true" data-1p-ignore maxlength="8" style="width:150px" placeholder="contoh: 2580"></div><div class="field"><label for="pin-ulang">Ulangi PIN</label><input type="password" id="pin-ulang" name="pin-ulang-rekapgaji" inputmode="numeric" autocomplete="new-password" data-lpignore="true" data-1p-ignore maxlength="8" style="width:150px" placeholder="ketik ulang"></div>
          <button class="btn" id="pin-simpan">Simpan PIN</button></div>
          <label class="row hint" style="gap:6px"><input type="checkbox" id="pin-lihat"> Tampilkan PIN</label>`}
        ${pinOk ? `<p class="hint" style="color:var(--accent)">${esc(pinOk)}</p>` : ""}<p class="hint neg" id="ak-msg">${esc(pinMsg)}</p>
        <p class="hint">Cocokkan kode kunci dengan approver lewat telepon/WA saat mendaftarkan.</p></div></div></div>`;
  }
  function bindAturanPersetujuan() {
    if ($("#ak-buat")) $("#ak-buat").onclick = async () => {
      const nama = $("#ak-nama").value.trim(); if (!nama) { $("#ak-nama").focus(); return; }
      try { await buatKunciApprover(nama, $("#ak-jab").value.trim()); renderAturan(); } catch (e) { setSaved("Kunci tidak bisa dibuat di browser ini: " + (e.message || e)); }
    };
    pinMsg = ""; pinOk = "";
    const err = (t) => { $("#ak-msg").textContent = t; };
    if ($("#pin-lihat")) $("#pin-lihat").onchange = (e) => { ["#ak-pin", "#pin-baru", "#pin-ulang"].forEach((q) => { if ($(q)) $(q).type = e.target.checked ? "text" : "password"; }); };
    if ($("#pin-simpan")) $("#pin-simpan").onclick = async () => {
      const a = $("#pin-baru").value.trim(), b = $("#pin-ulang").value.trim();
      if (!/^\d{4,8}$/.test(a)) { err("PIN harus 4 sampai 8 angka."); $("#pin-baru").focus(); return; }
      if (a !== b) { err("PIN dan ulangan PIN tidak sama. Ketik ulang."); $("#pin-ulang").value = ""; $("#pin-ulang").focus(); return; }
      cfg.apPinHash = await pinHash(a); scheduleSave(); pinOk = "PIN direktur tersimpan. Simpan baik-baik; PIN tidak bisa dilihat kembali."; renderAturan();
    };
    if ($("#pin-reset")) $("#pin-reset").onclick = (e) => {
      const btn = e.target;
      if (!btn.dataset.armed) { btn.dataset.armed = "1"; btn.textContent = "Klik lagi untuk reset"; return; }
      cfg.apPinHash = ""; cfg.approvers = []; scheduleSave(); pinOk = "PIN dan daftar approver sudah dihapus. Buat PIN baru bersama direktur."; renderAturan();
    };
    if ($("#ak-ttd")) { $("#ak-ttd").onclick = () => $("#ak-ttdfile").click(); $("#ak-ttdfile").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const k = kunciLokal(); k.ttdImg = await olahTTD(f); localStorage.setItem(APPR_KEY, JSON.stringify(k)); renderAturan(); } catch (er) { setSaved(er.message || String(er)); }
    }; }
    if ($("#ak-kartu")) $("#ak-kartu").onclick = () => { const k = kunciLokal(); saveFile(`Kartu_Approver_${k.nama.replace(/[^\w]+/g, "_")}.json`, JSON.stringify({ jenis: "kartu-approver", nama: k.nama, jabatan: k.jabatan, kode: k.kode, pub: k.pub }, null, 1), "application/json"); };
    if ($("#ak-hapus")) $("#ak-hapus").onclick = (e) => { const b = e.target; if (b.dataset.armed) { try { localStorage.removeItem(APPR_KEY); } catch (er) { /* abaikan */ } renderAturan(); } else { b.dataset.armed = "1"; b.textContent = "Klik lagi: kunci hilang permanen"; } };
    if ($("#ak-tambah")) { $("#ak-tambah").onclick = async () => { try { await cekPIN($("#ak-pin").value); $("#ak-file").click(); } catch (er) { err(er.message); $("#ak-pin").select(); } }; $("#ak-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; e.target.value = "";
      try {
        await cekPIN($("#ak-pin").value);
        const o = JSON.parse(await f.text());
        if (o.jenis !== "kartu-approver" || !o.pub) throw new Error("Bukan kartu approver.");
        o.kode = await kodeKunci(o.pub);
        cfg.approvers = (cfg.approvers || []).filter((a) => a.kode !== o.kode).concat([{ nama: o.nama, jabatan: o.jabatan, kode: o.kode, pub: o.pub }]);
        scheduleSave(); renderAturan();
      } catch (er) { err(er.message || String(er)); }
    }; }
    document.querySelectorAll("[data-apdel]").forEach((b) => b.onclick = async () => {
      if (!$("#ak-pin")) { err("Buat PIN direktur dulu."); return; }
      try { await cekPIN($("#ak-pin").value); cfg.approvers.splice(+b.dataset.apdel, 1); scheduleSave(); renderAturan(); } catch (er) { err(er.message || String(er)); }
    });
  }
