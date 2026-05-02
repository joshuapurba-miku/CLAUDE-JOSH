"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  async function onDelete() {
    if (!confirm("Yakin mau hapus kandidat ini? Aksi tidak bisa dibatalkan.")) return;
    const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Gagal menghapus.");
      return;
    }
    startTransition(() => router.push("/"));
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-sm text-rose-600 hover:text-rose-800 disabled:opacity-50"
    >
      Hapus kandidat
    </button>
  );
}
