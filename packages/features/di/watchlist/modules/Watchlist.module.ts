import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyGlobalWatchlistRepository } from "@calcom/features/watchlist/lib/repository/KyselyGlobalWatchlistRepository";
import { KyselyOrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/repository/KyselyOrganizationWatchlistRepository";
import { KyselyWatchlistAuditRepository } from "@calcom/features/watchlist/lib/repository/KyselyWatchlistAuditRepository";
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
  .toClass(KyselyGlobalWatchlistRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

watchlistModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
  .toClass(KyselyOrganizationWatchlistRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

// Bind remaining repositories
watchlistModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)
  .toClass(KyselyWatchlistAuditRepository, [DI_TOKENS.KYSELY_READ_DB, DI_TOKENS.KYSELY_WRITE_DB]);

// Services are created in the facade to handle Deps pattern properly
