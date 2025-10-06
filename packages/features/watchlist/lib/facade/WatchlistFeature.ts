import type { Container } from "@evyweb/ioctopus";

import { WATCHLIST_DI_TOKENS } from "../../di/tokens";
import type { AuditService } from "../service/AuditService";
import type { GlobalBlockingService } from "../service/GlobalBlockingService";
import type { OrganizationBlockingService } from "../service/OrganizationBlockingService";
import type { WatchlistService } from "../service/WatchlistService";

/**
 * Watchlist Feature Façade
 *
 * Single entrypoint that wires all Watchlist services together.
 * Prevents token sprawl and keeps call-sites uniform.
 *
 * Usage:
 * ```typescript
 * const watchlist = createWatchlistFeature(container);
 * const result = await watchlist.globalBlocking.isBlocked(email);
 * ```
 */
export interface WatchlistFeature {
  /** Global blocking service - handles global watchlist entries only */
  globalBlocking: GlobalBlockingService;
  /** Organization blocking service - handles org-specific entries only */
  orgBlocking: OrganizationBlockingService;
  /** Watchlist CRUD service - manages watchlist entries */
  watchlist: WatchlistService;
  /** Audit service - logs blocking attempts and decisions */
  audit: AuditService;
}

/**
 * Creates a typed Watchlist feature bundle from the DI container
 *
 * @param container - IoC container with loaded watchlist module
 * @returns Typed bundle of all watchlist services
 */
export function createWatchlistFeature(container: Container): WatchlistFeature {
  return {
    globalBlocking: container.get(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE),
    orgBlocking: container.get(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE),
    watchlist: container.get(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE),
    audit: container.get(WATCHLIST_DI_TOKENS.AUDIT_SERVICE),
  };
}
