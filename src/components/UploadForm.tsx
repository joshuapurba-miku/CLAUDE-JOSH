"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  results: { id: string; nama: string; skorAkhir: number; rekomendasi: string }[];
  errors: { fileName: string; error: string }[];
};

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [manualText, setManualText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 && !manualText.trim()) {
      setError("Pilih file CV atau tulis data manual dulu.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(
      files.length > 0
        ? `Mengirim ${files.length} file ke Claude AI untuk di-extract & di-score…`
        : "Mengirim data ke Claude AI…",
    );

    const form = new FormData();
    for (const f of files) form.append("files", f);
    if (manualText.trim()) form.append("manualText", manualText.trim());

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload gagal.");
      setResult(json);
      setFiles([]);
      setManualText("");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card p-6">
        <label className="label">File CV (PDF atau foto)</label>
        <p className="mt-1 text-sm text-slate-500">
          Bisa upload banyak file sekaligus. Mendukung PDF, JPG, PNG, WEBP.
        </p>
        <div className="mt-4">
          <label
            htmlFor="cv-files"
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl px-6 py-10 cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-colors"
          >
            <div className="text-4xl">📄</div>
            <div className="mt-2 text-sm font-medium text-slate-700">
              {files.length > 0 ? `${files.length} file dipilih` : "Klik untuk pilih file"}
            </div>
            <div className="text-xs text-slate-500 mt-1">PDF · JPG · PNG · WEBP (max 20MB / file)</div>
            <input
              id="cv-files"
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={onFileChange}
              disabled={busy}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-700">
                  <span className="text-slate-400">•</span>
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-slate-500">
                    ({(f.size / 1024).toFixed(0)} KB)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6">
        <label htmlFor="manual" className="label">
          Atau input manual (opsional)
        </label>
        <p className="mt-1 text-sm text-slate-500">
          Untuk kandidat tanpa CV. Tulis info yang kamu tahu: nama, usia, pengalaman, dsb.
        </p>
        <textarea
          id="manual"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={5}
          disabled={busy}
          placeholder="Contoh: Budi, 28 tahun, Bekasi. Pengalaman 2 tahun housekeeping di hotel. Tertarik shift malam. Punya motor."
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {progress && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500" />
          {progress}
        </div>
      )}

      {result && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold">Hasil screening</h3>
          {result.results.length > 0 && (
            <ul className="space-y-2">
              {result.results.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{r.nama}</div>
                    <div className="text-xs text-slate-500">
                      Skor {r.skorAkhir.toFixed(2)} · {r.rekomendasi}
                    </div>
                  </div>
                  <a
                    href={`/candidates/${r.id}`}
                    className="btn-secondary"
                  >
                    Lihat detail
                  </a>
                </li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <div className="font-medium mb-1">Error:</div>
              <ul className="list-disc list-inside space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{e.fileName}:</span> {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Sedang memproses…" : "Screening Sekarang"}
        </button>
      </div>
    </form>
  );
}
