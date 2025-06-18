// We can't keep it too high because that might cause stale content to be shown
// Configurable via options.slotsStaleTimeMs. We could keep it at a lower end as the impact would be refetch of availability only.
export const EMBED_MODAL_IFRAME_SLOT_STALE_TIME = 60 * 1000; // 1 minute
// Keep it high by default to avoid impact on loading time as it would cause a full reload of the iframe user can configure it via options.iframeForceReloadThresholdMs
// Also full reload means that response would be resubmitted.
export const EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

if (EMBED_MODAL_IFRAME_SLOT_STALE_TIME > EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS) {
  throw new Error(
    "EMBED_MODAL_IFRAME_SLOT_STALE_TIME must be less than EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS"
  );
}
