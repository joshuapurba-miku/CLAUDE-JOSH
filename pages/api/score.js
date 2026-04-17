import { scoreCandidate } from '../../lib/scoreCandidate';

const REQUIRED_FIELDS = [
  'nama',
  'usia',
  'kota',
  'pengalaman',
  'siap_shift',
  'siap_fisik',
  'motivasi',
  'riwayat_resign',
  'kendaraan',
  'komitmen_kontrak',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Field wajib tidak lengkap: ${missing.join(', ')}` });
  }

  try {
    const result = await scoreCandidate(req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Scoring error:', err);
    return res.status(500).json({ error: 'Gagal menilai kandidat. Coba lagi.' });
  }
}
