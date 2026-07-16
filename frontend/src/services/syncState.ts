// Standalone from syncEngine.ts to avoid a circular import with authApi.ts
// (syncEngine imports authApi for getUser; authApi needs this flag too).
let syncing = false;

export function setSyncInProgress(value: boolean) {
  syncing = value;
}

export function isSyncInProgress() {
  return syncing;
}
