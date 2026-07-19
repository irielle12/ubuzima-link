/* The QR encodes the full referral+patient payload (not just the reference
   number) so a receiving hospital can register the patient immediately even
   if the source device never syncs — that's deliberate, not bloat. But
   verbose JSON keys ("referralNumber", "destinationHospital", ...) were
   costing ~150+ of the ~430 encoded characters for no benefit, pushing the
   QR into a high-density version that's unreliable to scan on weaker
   cameras or in poor lighting. Short keys carry the same data at roughly
   half the size. Only the QR string itself uses these — everywhere else
   in the app keeps using the full descriptive field names. */
const KEY_MAP = {
  referralNumber: "rn",
  synced: "sy",
  patientName: "pn",
  patientAge: "pa",
  patientGender: "pg",
  patientPhone: "pp",
  chiefComplaint: "cc",
  diagnosis: "dx",
  urgency: "ur",
  referringFacility: "rf",
  sourceFacilityId: "sf",
  destinationHospital: "dh",
  referralDate: "rd",
} as const;

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([full, short]) => [short, full])
) as Record<string, string>;

export function encodeQrPayload(payload: Record<string, any>): string {
  const compact: Record<string, any> = {};
  for (const [full, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    const shortKey = (KEY_MAP as Record<string, string>)[full] || full;
    compact[shortKey] = value;
  }
  return JSON.stringify(compact);
}

/* Throws on invalid JSON, same as a raw JSON.parse would — callers already
   catch that for "not a Ubuzima-Link QR code" handling. */
export function decodeQrPayload(text: string): Record<string, any> {
  const compact = JSON.parse(text);
  const expanded: Record<string, any> = {};
  for (const [key, value] of Object.entries(compact)) {
    expanded[REVERSE_KEY_MAP[key] || key] = value;
  }
  return expanded;
}
