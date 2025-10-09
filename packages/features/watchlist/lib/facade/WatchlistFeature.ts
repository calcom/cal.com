import type { Container } from "@evyweb/ioctopus";

import { WATCHLIST_DI_TOKENS } from "@calcom/features/di/watchlist/Watchlist.tokens";

import type { IAuditRepository } from "../interface/IAuditRepository";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import { AuditService } from "../service/AuditService";
import { GlobalBlockingService } from "../service/GlobalBlockingService";
import { OrganizationBlockingService } from "../service/OrganizationBlockingService";
import { WatchlistService } from "../service/WatchlistService";

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
 * Handles the Deps pattern by creating services with proper dependency objects
 *
 * @param container - IoC container with loaded watchlist module
 * @returns Typed bundle of all watchlist services
 */
export function createWatchlistFeature(container: Container): WatchlistFeature {
  // Get repositories from container
  const globalRepo = container.get(
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY
  ) as IGlobalWatchlistRepository;
  const orgRepo = container.get(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  ) as IOrganizationWatchlistRepository;
  const auditRepo = container.get(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY) as IAuditRepository;

  // Create services with Deps pattern
  return {
    globalBlocking: new GlobalBlockingService({ globalRepo, orgRepo }),
    orgBlocking: new OrganizationBlockingService({ orgRepo }),
    watchlist: new WatchlistService({ globalRepo, orgRepo }),
    audit: new AuditService({ auditRepository: auditRepo }),
  };
}
