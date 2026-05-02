"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STATUSES } from "@/lib/types";

export function StatusControl({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onChange(next: string) {
    if (next === value) return;
    setValue(next);
    setErr(null);
    const res = await fetch(`/api/candidates/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErr(json.error || "Gagal update status");
      setValue(current);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
      >
        {PIPELINE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {err && <span className="text-xs text-rose-600">{err}</span>}
    </div>
  );
}
