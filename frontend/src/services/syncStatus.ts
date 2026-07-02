const LAST_SYNC_ATTEMPT_KEY = "lastSyncAttempt";
const CONNECTIVITY_STATE_KEY = "connectivityState";

export interface SyncAttempt {
  timestamp: number;
  success: boolean;
}

export function recordSyncAttempt(success: boolean) {
  const attempt: SyncAttempt = {
    timestamp: Date.now(),
    success,
  };

  localStorage.setItem(
    LAST_SYNC_ATTEMPT_KEY,
    JSON.stringify(attempt)
  );
}

export function getLastSyncAttempt(): SyncAttempt | null {
  const stored = localStorage.getItem(LAST_SYNC_ATTEMPT_KEY);
  return stored ? JSON.parse(stored) : null;
}

export interface ConnectivityState {
  online: boolean;
  since: number;
}

export function recordConnectivityChange(online: boolean) {
  const state: ConnectivityState = {
    online,
    since: Date.now(),
  };

  localStorage.setItem(
    CONNECTIVITY_STATE_KEY,
    JSON.stringify(state)
  );
}

export function getConnectivityState(): ConnectivityState | null {
  const stored = localStorage.getItem(CONNECTIVITY_STATE_KEY);
  return stored ? JSON.parse(stored) : null;
}
