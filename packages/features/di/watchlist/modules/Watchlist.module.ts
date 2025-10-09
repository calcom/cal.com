import { createModule, type Container } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { IAuditRepository } from "@calcom/features/watchlist/lib/interface/IAuditRepository";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "@calcom/features/watchlist/lib/interface/IWatchlistRepositories";
import { AuditRepository } from "@calcom/features/watchlist/lib/repository/AuditRepository";
import { GlobalWatchlistRepository } from "@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository";
import { OrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/repository/OrganizationWatchlistRepository";
import { AuditService } from "@calcom/features/watchlist/lib/service/AuditService";
import { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";

import { WATCHLIST_DI_TOKENS } from "../Watchlist.tokens";

export const watchlistModule = createModule();

// Bind specialized repositories
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY)
  .toClass(GlobalWatchlistRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
  .toClass(OrganizationWatchlistRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind remaining repositories
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)
  .toClass(AuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind services with factory functions to handle Deps pattern
watchlistModule.bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE).toFactory((container: Container) => {
  const auditRepository = container.get(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY) as IAuditRepository;
  return new AuditService({ auditRepository });
});

watchlistModule.bind(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE).toFactory((container: Container) => {
  const globalRepo = container.get(
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY
  ) as IGlobalWatchlistRepository;
  const orgRepo = container.get(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  ) as IOrganizationWatchlistRepository;
  return new GlobalBlockingService({ globalRepo, orgRepo });
});

watchlistModule.bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE).toFactory((container: Container) => {
  const orgRepo = container.get(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  ) as IOrganizationWatchlistRepository;
  return new OrganizationBlockingService({ orgRepo });
});

watchlistModule.bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE).toFactory((container: Container) => {
  const globalRepo = container.get(
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY
  ) as IGlobalWatchlistRepository;
  const orgRepo = container.get(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  ) as IOrganizationWatchlistRepository;
  return new WatchlistService({ globalRepo, orgRepo });
});
