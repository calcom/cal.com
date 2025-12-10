/**
 * Feature state type for tri-state feature management.
 *
 * - "enabled": Feature is explicitly enabled (row exists with enabled=true)
 * - "disabled": Feature is explicitly disabled (row exists with enabled=false)
 * - "inherit": No explicit setting (no row exists, inherit from higher level)
 */
export type FeatureState = "enabled" | "disabled" | "inherit";
