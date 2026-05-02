import Link from "next/link";
import { prisma } from "@/lib/db";
import { CandidateTable } from "@/components/CandidateTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      nama: true,
      usia: true,
      kota: true,
      posisiDilamar: true,
      pengalamanTahun: true,
      skorAkhir: true,
      rekomendasi: true,
      status: true,
    },
  });

  const total = candidates.length;
  const lanjut = candidates.filter((c) => c.rekomendasi === "Lanjut").length;
  const dipertimbangkan = candidates.filter((c) => c.rekomendasi === "Dipertimbangkan").length;
  const ditolak = candidates.filter((c) => c.rekomendasi === "Ditolak").length;
  const hired = candidates.filter((c) => c.status === "Hired").length;
  const avgScore =
    total > 0 ? candidates.reduce((acc, c) => acc + c.skorAkhir, 0) / total : 0;

  const rows = candidates.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Pelamar</h1>
          <p className="text-sm text-slate-600 mt-1">
            Database seluruh kandidat yang sudah di-screening oleh sistem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={total} tone="slate" />
        <Stat label="Lanjut" value={lanjut} tone="emerald" />
        <Stat label="Dipertimbangkan" value={dipertimbangkan} tone="amber" />
        <Stat label="Ditolak" value={ditolak} tone="rose" />
        <Stat label="Hired" value={hired} tone="emerald" />
        <Stat label="Skor rata-rata" value={avgScore.toFixed(2)} tone="slate" />
      </div>

      {total === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-lg">Belum ada kandidat</h3>
          <p className="text-slate-600 text-sm mt-1">
            Mulai dengan meng-upload CV pelamar untuk di-screening otomatis.
          </p>
          <Link href="/upload" className="btn-primary mt-4">
            Upload CV Pertama
          </Link>
        </div>
      ) : (
        <CandidateTable rows={rows} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const toneMap = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}
