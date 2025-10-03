import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaAuditRepository } from "@calcom/features/watchlist/lib/repository/PrismaAuditRepository";
import { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import { AuditService } from "@calcom/features/watchlist/lib/service/AuditService";
import { BlockingService } from "@calcom/features/watchlist/lib/service/BlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";
import { SHARED_TOKENS } from "@calcom/lib/di/shared/shared.tokens";

import { WATCHLIST_DI_TOKENS } from "../tokens";

export const watchlistModule = createModule();

// Bind repositories
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY)
  .toClass(WatchlistRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)
  .toClass(PrismaAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind services
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
  .toClass(AuditService, [WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE)
  .toClass(BlockingService, [WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY, WATCHLIST_DI_TOKENS.AUDIT_SERVICE]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
  .toClass(OrganizationBlockingService, [WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE)
  .toClass(WatchlistService, [WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY, SHARED_TOKENS.LOGGER]);
