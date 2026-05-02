import clsx from "clsx";

function colorFor(score: number) {
  if (score >= 7.5) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-rose-500";
}

export function ScoreBar({ label, score, reasoning }: { label: string; score: number; reasoning?: string }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums font-semibold text-slate-900">{score.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={clsx("h-full rounded-full", colorFor(score))} style={{ width: `${pct}%` }} />
      </div>
      {reasoning ? <p className="mt-1 text-xs text-slate-500">{reasoning}</p> : null}
    </div>
  );
}

export function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 10));
  const dash = c * pct;
  const color = score >= 7.5 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-14 w-14">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
        {score.toFixed(1)}
      </div>
    </div>
  );
}
