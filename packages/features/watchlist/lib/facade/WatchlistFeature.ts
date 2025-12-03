import type { Container } from "@evyweb/ioctopus";

import { WATCHLIST_DI_TOKENS } from "@calcom/features/di/watchlist/Watchlist.tokens";
import logger from "@calcom/lib/logger";

import type { IAuditRepository } from "../interface/IAuditRepository";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import { GlobalBlockingService } from "../service/GlobalBlockingService";
import { OrganizationBlockingService } from "../service/OrganizationBlockingService";
import { WatchlistAuditService } from "../service/WatchlistAuditService";
import { WatchlistService } from "../service/WatchlistService";

export interface WatchlistFeature {
  /** Global blocking service - handles global watchlist entries only */
  globalBlocking: GlobalBlockingService;
  /** Organization blocking service - handles org-specific entries only */
  orgBlocking: OrganizationBlockingService;
  /** Watchlist CRUD service - manages watchlist entries */
  watchlist: WatchlistService;
  /** Audit service - logs blocking attempts and decisions */
  audit: WatchlistAuditService;
}

export function createWatchlistFeature(container: Container): WatchlistFeature {
  // Get repositories from container
  const globalRepo = container.get<IGlobalWatchlistRepository>(
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY
  );
  const orgRepo = container.get<IOrganizationWatchlistRepository>(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  );
  const auditRepo = container.get<IAuditRepository>(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY);

  // Create sub-loggers for each service
  const watchlistLogger = logger.getSubLogger({ prefix: ["[WatchlistService]"] });

  // Create services with Deps pattern
  return {
    globalBlocking: new GlobalBlockingService({ globalRepo }),
    orgBlocking: new OrganizationBlockingService({ orgRepo }),
    watchlist: new WatchlistService({ globalRepo, orgRepo, logger: watchlistLogger }),
    audit: new WatchlistAuditService({ auditRepository: auditRepo }),
  };
}
