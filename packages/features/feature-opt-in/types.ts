/**
 * Explicit state for API/UI layer.
 * - "enabled": upsert row with enabled = true
 * - "disabled": upsert row with enabled = false
 * - "inherit": delete the row (inherit from higher level)
 */
export type FeatureState = "enabled" | "disabled" | "inherit";
