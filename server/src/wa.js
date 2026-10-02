// Klien WhatsApp via Fonnte (https://fonnte.com).
// Bila FONNTE_TOKEN belum diisi, pesan hanya dicetak ke log (mode uji).
const TOKEN = process.env.FONNTE_TOKEN || "";
const API_URL = process.env.FONNTE_API || "https://api.fonnte.com/send";

// Normalkan nomor: 08xx -> 628xx, buang karakter non-digit.
export function normalizePhone(num) {
  let s = String(num || "").replace(/[^\d]/g, "");
  if (s.startsWith("0")) s = "62" + s.slice(1);
  if (s.startsWith("620")) s = "62" + s.slice(3);
  return s;
}

export async function sendWA(target, message) {
  const to = normalizePhone(target);
  if (!TOKEN) {
    console.log(`\n[WA MOCK] -> ${to}\n${message}\n`);
    return { status: true, mock: true };
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ target: to, message, countryCode: "62" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) {
      console.error("Gagal kirim WA:", json);
    }
    return json;
  } catch (err) {
    console.error("Error kirim WA:", err.message);
    return { status: false, error: err.message };
  }
}

export const waEnabled = () => Boolean(TOKEN);
