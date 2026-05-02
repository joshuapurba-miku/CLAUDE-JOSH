import clsx from "clsx";

const STATUS_STYLES: Record<string, string> = {
  Applied: "bg-slate-100 text-slate-700",
  Screening: "bg-blue-100 text-blue-700",
  Interview: "bg-indigo-100 text-indigo-700",
  Offer: "bg-amber-100 text-amber-800",
  Hired: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={clsx("chip", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700")}>{status}</span>;
}

const REKOM_STYLES: Record<string, string> = {
  Lanjut: "bg-emerald-100 text-emerald-700",
  Dipertimbangkan: "bg-amber-100 text-amber-800",
  Ditolak: "bg-rose-100 text-rose-700",
};

export function RekomendasiBadge({ rekomendasi }: { rekomendasi: string }) {
  return (
    <span className={clsx("chip", REKOM_STYLES[rekomendasi] ?? "bg-slate-100 text-slate-700")}>
      {rekomendasi}
    </span>
  );
}
