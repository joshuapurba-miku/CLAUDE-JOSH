import { useState } from 'react';

const REKOMENDASI_COLOR = {
  Lanjut: '#16a34a',
  Dipertimbangkan: '#d97706',
  Ditolak: '#dc2626',
};

const DIMENSI_LABELS = {
  attitude: 'Attitude',
  kesiapan_fisik: 'Kesiapan Fisik',
  pengalaman: 'Pengalaman',
  disiplin: 'Disiplin',
  komitmen: 'Komitmen',
  komunikasi: 'Komunikasi',
};

export default function Home() {
  const [form, setForm] = useState({
    nama: '',
    usia: '',
    kota: '',
    pengalaman: '',
    siap_shift: '',
    siap_fisik: '',
    motivasi: '',
    riwayat_resign: '',
    kendaraan: '',
    komitmen_kontrak: '',
    isi_cv: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, usia: Number(form.usia) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>GOKLIRR — Penilaian Kandidat</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>Isi form berikut untuk menilai kandidat secara otomatis menggunakan AI.</p>

      <form onSubmit={handleSubmit}>
        <Section title="Data Dasar">
          <Field label="Nama Lengkap" name="nama" value={form.nama} onChange={handleChange} required />
          <Field label="Usia" name="usia" type="number" value={form.usia} onChange={handleChange} required />
          <Field label="Kota / Domisili" name="kota" value={form.kota} onChange={handleChange} required />
        </Section>

        <Section title="Jawaban Form Kandidat">
          <Field label="Pengalaman Kerja" name="pengalaman" textarea value={form.pengalaman} onChange={handleChange} required placeholder="Contoh: 2 tahun housekeeping di hotel bintang 3" />
          <Field label="Siap Kerja Shift?" name="siap_shift" value={form.siap_shift} onChange={handleChange} required placeholder="Contoh: Siap semua shift" />
          <Field label="Siap Kerja Fisik Berat?" name="siap_fisik" value={form.siap_fisik} onChange={handleChange} required placeholder="Contoh: Sangat siap, sudah terbiasa" />
          <Field label="Motivasi Bergabung" name="motivasi" textarea value={form.motivasi} onChange={handleChange} required placeholder="Contoh: Ingin berkarir dan punya penghasilan tetap" />
          <Field label="Riwayat Resign" name="riwayat_resign" textarea value={form.riwayat_resign} onChange={handleChange} required placeholder="Contoh: Pernah resign normal karena kontrak habis" />
          <Field label="Punya Kendaraan?" name="kendaraan" value={form.kendaraan} onChange={handleChange} required placeholder="Contoh: Motor sendiri" />
          <Field label="Komitmen Kontrak" name="komitmen_kontrak" textarea value={form.komitmen_kontrak} onChange={handleChange} required placeholder="Contoh: Siap tanda tangan kontrak 1 tahun" />
        </Section>

        <Section title="CV (Opsional)">
          <Field label="Isi CV / Ringkasan" name="isi_cv" textarea value={form.isi_cv} onChange={handleChange} placeholder="Paste ringkasan CV di sini, atau kosongkan jika tidak ada" />
        </Section>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            background: loading ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Menilai kandidat...' : 'Nilai Kandidat'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 24, padding: 16, background: '#fee2e2', borderRadius: 8, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {result && <ResultCard result={result} />}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, name, value, onChange, textarea, required, placeholder, type = 'text' }) {
  const style = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {textarea ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3} style={{ ...style, resize: 'vertical' }} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} style={style} />
      )}
    </div>
  );
}

function ResultCard({ result }) {
  const rekColor = REKOMENDASI_COLOR[result.rekomendasi] || '#374151';
  const isPrescreen = result._source === 'prescreen';
  return (
    <div style={{ marginTop: 32, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: rekColor, padding: '20px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Skor Total</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{result.skor_total}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {isPrescreen && (
              <div style={{ fontSize: 11, background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '2px 8px', marginBottom: 4, display: 'inline-block' }}>
                Auto-rejected (pre-screening)
              </div>
            )}
            <div style={{ fontSize: 13, opacity: 0.85 }}>Rekomendasi</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{result.rekomendasi}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Skor Per Dimensi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {Object.entries(result.dimensi).map(([key, val]) => (
            <div key={key} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{DIMENSI_LABELS[key] || key}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Analisa</h3>
        <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 20, lineHeight: 1.6 }}>{result.analisa_singkat}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>Nilai Positif</h3>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
              {result.nilai_positif.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Risiko</h3>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
              {result.risiko.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>

        {isPrescreen && result._prescreen?.reasons?.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>Detail Pre-Screening:</div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#7f1d1d', lineHeight: 1.8 }}>
              {result._prescreen.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Catatan HR: </span>
          <span style={{ fontSize: 13, color: '#78350f' }}>{result.catatan_hr}</span>
        </div>
      </div>
    </div>
  );
}
