import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { GlobalWatchlistRepository } from "@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository";
import { OrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/repository/OrganizationWatchlistRepository";
import { PrismaWatchlistAuditRepository } from "@calcom/features/watchlist/lib/repository/PrismaWatchlistAuditRepository";
import { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";

import { WATCHLIST_DI_TOKENS } from "../Watchlist.tokens";

export const watchlistModule = createModule();

watchlistModule.bind(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE).toClass(GlobalBlockingService, {
  globalRepo: DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY,
});

watchlistModule.bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE).toClass(OrganizationBlockingService, {
  orgRepo: DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY,
});

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
  .toClass(PrismaWatchlistAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Services are created in the facade to handle Deps pattern properly
