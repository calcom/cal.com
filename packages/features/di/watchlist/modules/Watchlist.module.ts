import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { GlobalWatchlistRepository } from "@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository";
import { OrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/repository/OrganizationWatchlistRepository";
import { PrismaAuditRepository } from "@calcom/features/watchlist/lib/repository/PrismaAuditRepository";
import { AuditService } from "@calcom/features/watchlist/lib/service/AuditService";
import { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";
import { SHARED_TOKENS } from "@calcom/lib/di/shared/shared.tokens";

import { WATCHLIST_DI_TOKENS } from "../tokens";

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
  .toClass(PrismaAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind services
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
  .toClass(AuditService, [WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE)
  .toClass(GlobalBlockingService, [
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY,
    WATCHLIST_DI_TOKENS.AUDIT_SERVICE,
  ]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
  .toClass(OrganizationBlockingService, [WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE)
  .toClass(WatchlistService, [
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY,
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY,
    SHARED_TOKENS.LOGGER,
  ]);
