/**
 * Barrel file that re-exports from both server and client modules for backward compatibility.
 *
 * IMPORTANT: This file imports from raqbUtils.client.ts which requires the react-awesome-query-builder runtime.
 * For server-side code (cron jobs, API routes, etc.), import directly from raqbUtils.server.ts instead
 * to avoid pulling in the client-only RAQB library.
 *
 * Server-side imports should use:
 *   import { acrossQueryValueCompatiblity, raqbQueryValueUtils } from "@calcom/app-store/_utils/raqb/raqbUtils.server";
 *
 * Client-side imports can use this file or import directly from raqbUtils.client.ts:
 *   import { buildStateFromQueryValue, buildEmptyQueryValue } from "@calcom/app-store/_utils/raqb/raqbUtils.client";
 */

// Re-export client-only utilities (requires react-awesome-query-builder runtime)
export { buildEmptyQueryValue, buildStateFromQueryValue } from "./raqbUtils.client";
// Re-export server-safe utilities
export {
  acrossQueryValueCompatiblity,
  getAttributesQueryBuilderConfigHavingListofLabels,
  getValueOfAttributeOption,
  raqbQueryValueUtils,
} from "./raqbUtils.server";
