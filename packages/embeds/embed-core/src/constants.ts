// We can't keep it too high because that might cause stale content to be shown
// TODO: We should introduce a slotRefresh mechanism
export const EMBED_MODAL_IFRAME_SLOT_STALE_TIME = 10 * 1000; // 1 minute
export const EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

if (EMBED_MODAL_IFRAME_SLOT_STALE_TIME > EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS) {
  throw new Error(
    "EMBED_MODAL_IFRAME_SLOT_STALE_TIME must be less than EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS"
  );
}
