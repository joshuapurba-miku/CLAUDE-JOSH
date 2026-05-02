"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RekomendasiBadge, StatusBadge } from "./StatusBadge";
import { PIPELINE_STATUSES, REKOMENDASI } from "@/lib/types";

type Row = {
  id: string;
  createdAt: string;
  nama: string;
  usia: number | null;
  kota: string | null;
  posisiDilamar: string | null;
  pengalamanTahun: number | null;
  skorAkhir: number;
  rekomendasi: string;
  status: string;
};

type SortKey = "createdAt" | "nama" | "skorAkhir" | "status";

export function CandidateTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rekomFilter, setRekomFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (rekomFilter !== "all" && r.rekomendasi !== rekomFilter) return false;
      if (!q) return true;
      return (
        r.nama.toLowerCase().includes(q) ||
        (r.kota ?? "").toLowerCase().includes(q) ||
        (r.posisiDilamar ?? "").toLowerCase().includes(q)
      );
    });
    out.sort((a, b) => {
      let cmp = 0;
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, search, statusFilter, rekomFilter, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir(k === "nama" ? "asc" : "desc");
    }
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Cari nama, kota, posisi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="all">Semua status</option>
          {PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={rekomFilter}
          onChange={(e) => setRekomFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="all">Semua rekomendasi</option>
          {REKOMENDASI.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <a href="/api/export" className="btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <Th onClick={() => toggleSort("nama")} active={sortBy === "nama"} dir={sortDir}>
                Nama
              </Th>
              <th className="text-left px-4 py-3 font-medium">Usia</th>
              <th className="text-left px-4 py-3 font-medium">Kota</th>
              <th className="text-left px-4 py-3 font-medium">Pengalaman</th>
              <Th onClick={() => toggleSort("skorAkhir")} active={sortBy === "skorAkhir"} dir={sortDir}>
                Skor
              </Th>
              <th className="text-left px-4 py-3 font-medium">Rekomendasi</th>
              <Th onClick={() => toggleSort("status")} active={sortBy === "status"} dir={sortDir}>
                Status
              </Th>
              <Th
                onClick={() => toggleSort("createdAt")}
                active={sortBy === "createdAt"}
                dir={sortDir}
              >
                Tanggal
              </Th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  Tidak ada kandidat sesuai filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/candidates/${r.id}`} className="hover:text-brand-600">
                    {r.nama}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.usia ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.kota ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.pengalamanTahun != null ? `${r.pengalamanTahun} th` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.skorAkhir >= 7.5
                        ? "font-semibold text-emerald-700"
                        : r.skorAkhir >= 5
                        ? "font-semibold text-amber-700"
                        : "font-semibold text-rose-700"
                    }
                  >
                    {r.skorAkhir.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RekomendasiBadge rekomendasi={r.rekomendasi} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(r.createdAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/candidates/${r.id}`} className="text-brand-600 text-sm hover:underline">
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
        Menampilkan {filtered.length} dari {rows.length} kandidat
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="text-left px-4 py-3 font-medium">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-900">
        {children}
        {active && <span>{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
