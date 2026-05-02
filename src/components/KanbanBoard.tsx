"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RekomendasiBadge } from "./StatusBadge";
import { PIPELINE_STATUSES } from "@/lib/types";

type Card = {
  id: string;
  nama: string;
  kota: string | null;
  skorAkhir: number;
  rekomendasi: string;
  status: string;
};

export function KanbanBoard({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [overCol, setOverCol] = useState<string | null>(null);

  async function moveTo(id: string, status: string) {
    const prev = items;
    setItems((cur) => cur.map((c) => (c.id === id ? { ...c, status } : c)));
    const res = await fetch(`/api/candidates/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setItems(prev);
      alert("Gagal update status.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {PIPELINE_STATUSES.map((col) => {
        const colItems = items.filter((i) => i.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              if (draggingId) moveTo(draggingId, col);
              setDraggingId(null);
            }}
            className={`rounded-xl border p-2 min-h-[60vh] transition-colors ${
              overCol === col ? "bg-brand-50 border-brand-300" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <div className="font-semibold text-sm">{col}</div>
              <span className="chip bg-white border border-slate-200 text-slate-600">
                {colItems.length}
              </span>
            </div>
            <div className="space-y-2">
              {colItems.length === 0 && (
                <div className="text-xs text-slate-400 px-2 py-4 text-center">kosong</div>
              )}
              {colItems.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDraggingId(c.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className="rounded-lg bg-white border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-sm"
                >
                  <Link href={`/candidates/${c.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm truncate">{c.nama}</div>
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          c.skorAkhir >= 7.5
                            ? "text-emerald-700"
                            : c.skorAkhir >= 5
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {c.skorAkhir.toFixed(1)}
                      </span>
                    </div>
                    {c.kota && <div className="text-xs text-slate-500 mt-0.5">{c.kota}</div>}
                    <div className="mt-2">
                      <RekomendasiBadge rekomendasi={c.rekomendasi} />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
