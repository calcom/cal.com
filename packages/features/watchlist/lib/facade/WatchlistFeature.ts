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
