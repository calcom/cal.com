import { createModule } from "@evyweb/ioctopus";

import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { AuditService } from "@calcom/features/watchlist/lib/service/AuditService";
import { BlockingService } from "@calcom/features/watchlist/lib/service/BlockingService";
import { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";

import { WATCHLIST_DI_TOKENS } from "../Watchlist.tokens";

export const watchlistServicesModule = createModule();

watchlistServicesModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE)
  .toClass(WatchlistService, [WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY, SHARED_TOKENS.LOGGER]);

watchlistServicesModule
  .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
  .toClass(AuditService, [WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY]);

watchlistServicesModule
  .bind(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE)
  .toClass(BlockingService, [
    WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY,
    WATCHLIST_DI_TOKENS.AUDIT_SERVICE,
  ]);

watchlistServicesModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
  .toClass(OrganizationBlockingService, [WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY]);
