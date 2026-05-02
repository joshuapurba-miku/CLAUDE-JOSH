import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RekomendasiBadge, StatusBadge } from "@/components/StatusBadge";
import { ScoreBar, ScoreRing } from "@/components/ScoreBar";
import { StatusControl } from "@/components/StatusControl";
import { NoteForm } from "@/components/NoteForm";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function CandidateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.candidate.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  const reasoning = c.reasoning ? safeJson(c.reasoning) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-700">{c.nama}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={c.skorAkhir} />
            <div>
              <h1 className="text-2xl font-semibold">{c.nama}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {c.usia != null && <span>{c.usia} th</span>}
                {c.jenisKelamin && <span>· {c.jenisKelamin}</span>}
                {c.kota && <span>· {c.kota}</span>}
                {c.posisiDilamar && <span>· {c.posisiDilamar}</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <RekomendasiBadge rekomendasi={c.rekomendasi} />
                <StatusBadge status={c.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusControl id={c.id} current={c.status} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Field label="Telepon" value={c.telepon} />
          <Field label="Email" value={c.email} />
          <Field label="Pendidikan" value={c.pendidikan} />
          <Field
            label="Pengalaman"
            value={c.pengalamanTahun != null ? `${c.pengalamanTahun} tahun` : null}
          />
          <Field label="Pengalaman cleaning" value={c.pengalamanCleaning ? "Ya" : "Tidak"} />
          <Field label="Punya kendaraan" value={c.punyaKendaraan ? "Ya" : "Tidak"} />
          <Field label="File CV" value={c.cvFileName ?? "—"} />
          <Field
            label="Tgl. dibuat"
            value={new Date(c.createdAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Breakdown Skor</h2>
            <div className="space-y-4">
              <ScoreBar
                label="Attitude (20%)"
                score={c.skorAttitude}
                reasoning={reasoning?.attitude}
              />
              <ScoreBar
                label="Kesiapan Fisik (20%)"
                score={c.skorKesiapanFisik}
                reasoning={reasoning?.kesiapan_fisik}
              />
              <ScoreBar
                label="Pengalaman (20%)"
                score={c.skorPengalaman}
                reasoning={reasoning?.pengalaman}
              />
              <ScoreBar
                label="Disiplin (15%)"
                score={c.skorDisiplin}
                reasoning={reasoning?.disiplin}
              />
              <ScoreBar
                label="Komitmen (15%)"
                score={c.skorKomitmen}
                reasoning={reasoning?.komitmen}
              />
              <ScoreBar
                label="Komunikasi (10%)"
                score={c.skorKomunikasi}
                reasoning={reasoning?.komunikasi}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <Summary label="Weighted" value={reasoning?.breakdown?.weighted?.toFixed(2) ?? "—"} />
              <Summary
                label="Bonus"
                value={c.bonus > 0 ? `+${c.bonus.toFixed(2)}` : "0"}
                tone={c.bonus > 0 ? "emerald" : "slate"}
              />
              <Summary
                label="Penalti"
                value={c.penalti > 0 ? `−${c.penalti.toFixed(2)}` : "0"}
                tone={c.penalti > 0 ? "rose" : "slate"}
              />
            </div>

            {(reasoning?.breakdown?.bonusDetail?.length > 0 ||
              reasoning?.breakdown?.penaltiDetail?.length > 0) && (
              <div className="mt-4 space-y-2 text-sm">
                {reasoning?.breakdown?.bonusDetail?.length > 0 && (
                  <div>
                    <div className="label mb-1">Bonus</div>
                    <ul className="list-disc list-inside text-emerald-700">
                      {reasoning.breakdown.bonusDetail.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reasoning?.breakdown?.penaltiDetail?.length > 0 && (
                  <div>
                    <div className="label mb-1">Penalti</div>
                    <ul className="list-disc list-inside text-rose-700">
                      {reasoning.breakdown.penaltiDetail.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {reasoning?.ringkasan && (
              <div className="mt-6 rounded-md bg-slate-50 border border-slate-200 p-4">
                <div className="label mb-1">Ringkasan AI</div>
                <p className="text-sm text-slate-700">{reasoning.ringkasan}</p>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold mb-4">Catatan HR</h2>
            <NoteForm candidateId={c.id} />
            <ul className="mt-6 space-y-3">
              {c.notes.length === 0 && (
                <li className="text-sm text-slate-500">Belum ada catatan.</li>
              )}
              {c.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{n.author}</span>
                    <span>
                      {new Date(n.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Timeline Rekrutmen</h2>
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
              {c.timeline.map((t) => (
                <li key={t.id} className="ml-4">
                  <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand-500 border-2 border-white" />
                  <div className="text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                  <div className="text-sm text-slate-800">{t.description}</div>
                </li>
              ))}
            </ol>
          </div>

          {c.cvRawText && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Teks CV (hasil ekstraksi)</h2>
              <pre className="text-xs whitespace-pre-wrap text-slate-600 max-h-96 overflow-y-auto">
                {c.cvRawText}
              </pre>
            </div>
          )}

          <div className="flex justify-end">
            <DeleteButton id={c.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-0.5 text-slate-800">{value || "—"}</div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "rose";
}) {
  const t =
    tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="label">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${t}`}>{value}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
