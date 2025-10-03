import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { GlobalWatchlistRepository } from "@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository";
import { OrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/repository/OrganizationWatchlistRepository";
import { PrismaAuditRepository } from "@calcom/features/watchlist/lib/repository/PrismaAuditRepository";
import { PrismaWatchlistReadRepository } from "@calcom/features/watchlist/lib/repository/PrismaWatchlistReadRepository";
import { PrismaWatchlistRepository } from "@calcom/features/watchlist/lib/repository/PrismaWatchlistRepository";
import { PrismaWatchlistWriteRepository } from "@calcom/features/watchlist/lib/repository/PrismaWatchlistWriteRepository";
import { AuditService } from "@calcom/features/watchlist/lib/service/AuditService";
import { BlockingService } from "@calcom/features/watchlist/lib/service/BlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";
import { SHARED_TOKENS } from "@calcom/lib/di/shared/shared.tokens";

import { WATCHLIST_DI_TOKENS } from "../tokens";

export const watchlistModule = createModule();

// Bind repositories
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY)
  .toClass(PrismaWatchlistReadRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_WRITE_REPOSITORY)
  .toClass(PrismaWatchlistWriteRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY)
  .toClass(PrismaWatchlistRepository, [
    WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY,
    WATCHLIST_DI_TOKENS.WATCHLIST_WRITE_REPOSITORY,
  ]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)
  .toClass(PrismaAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY)
  .toClass(GlobalWatchlistRepository, [DI_TOKENS.PRISMA_CLIENT]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
  .toClass(OrganizationWatchlistRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind services
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
  .toClass(AuditService, [WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE)
  .toClass(BlockingService, [
    WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY,
    WATCHLIST_DI_TOKENS.AUDIT_SERVICE,
  ]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
  .toClass(OrganizationBlockingService, [WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE)
  .toClass(WatchlistService, [WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY, SHARED_TOKENS.LOGGER]);
