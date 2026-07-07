/* Tracks which closed referrals a facility has already seen, keyed by
   referral ID rather than a raw count. A count-diff ("closed so far minus
   last-seen total") breaks the moment the count doesn't move monotonically
   — an offline/stale cache snapshot, a referral getting reopened then
   reclosed, etc. — either hiding a genuinely new notification or resurfacing
   an already-viewed one. Tracking exactly which IDs have been seen is
   immune to that. */

const KEY_PREFIX = "seenClosedReferralIds_";

function getSeenIds(facilityId: string | number): Set<number> {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + facilityId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(facilityId: string | number, ids: Set<number>) {
  localStorage.setItem(KEY_PREFIX + facilityId, JSON.stringify([...ids]));
}

export function getUnseenClosedReferrals<T extends { id: number }>(
  facilityId: string | number,
  closedReferrals: T[]
): T[] {
  const seen = getSeenIds(facilityId);
  return closedReferrals.filter((r) => !seen.has(r.id));
}

export function markClosedReferralsSeen(
  facilityId: string | number,
  closedReferrals: { id: number }[]
) {
  if (closedReferrals.length === 0) return;
  const seen = getSeenIds(facilityId);
  closedReferrals.forEach((r) => seen.add(r.id));
  saveSeenIds(facilityId, seen);
}
