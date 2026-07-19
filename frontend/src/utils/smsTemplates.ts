// Patient-facing SMS text — in Kinyarwanda since patients, not staff, are
// the recipients. Kept in one place because it was previously duplicated
// (NewReferral.tsx for the online-creation path, syncEngine.ts for the
// offline-then-synced path) and had already drifted into two copies.
//
// TRANSLATION NOTE: drafted using vocabulary already used elsewhere in this
// app's rw.ts translations (e.g. "Nimero y'inkomoko" for reference number),
// but not verified by a native Kinyarwanda speaker — please review the
// wording below before relying on it with real patients.
export function buildReferralSmsMessage(hospitalName: string, referralNumber: string): string {
  return `Ubuzima-Link: Woherejwe kw'ibitaro bya ${hospitalName}. Nimero y'inkomoko y'ubutumwa bwawe ni 
  ${referralNumber}. Nyamuneka bika iyi nimero kugira ngo uyizane igihe uzajya kwivuza.`;
}
