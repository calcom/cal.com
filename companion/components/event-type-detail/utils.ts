/**
 * Utility functions for Event Type Detail
 *
 * This file re-exports utilities from centralized locations for backward compatibility.
 * New code should import directly from the source files.
 */

// Re-export partial update utilities
export { buildPartialUpdatePayload, hasChanges } from "./utils/buildPartialUpdatePayload";

// Re-export formatting utilities from centralized location
export { formatDuration, truncateTitle, formatAppIdToDisplayName } from "../../utils/formatters";

// Re-export location utilities from centralized location
export { displayNameToLocationValue } from "../../utils/locationHelpers";
