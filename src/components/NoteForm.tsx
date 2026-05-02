"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NoteForm({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("HR");
  const [busy, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setErr(null);
    const res = await fetch(`/api/candidates/${candidateId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim(), author: author.trim() }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErr(json.error || "Gagal menyimpan catatan");
      return;
    }
    setBody("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Nama HR"
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Tulis catatan tentang kandidat ini…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {err && <div className="text-sm text-rose-600">{err}</div>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="btn-primary disabled:opacity-50"
        >
          Tambah Catatan
        </button>
      </div>
    </form>
  );
}
