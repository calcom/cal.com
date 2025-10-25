import { createContainer } from "@evyweb/ioctopus";

import { loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { taskerServiceModule } from "@calcom/features/di/shared/services/tasker.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import {
  createWatchlistFeature,
  type WatchlistFeature,
} from "@calcom/features/watchlist/lib/facade/WatchlistFeature";
import type { IGlobalWatchlistRepository } from "@calcom/features/watchlist/lib/interface/IWatchlistRepositories";
import type { IOrganizationWatchlistRepository } from "@calcom/features/watchlist/lib/interface/IWatchlistRepositories";
import type { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import type { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import type { WatchlistAuditService } from "@calcom/features/watchlist/lib/service/WatchlistAuditService";
import type { WatchlistService } from "@calcom/features/watchlist/lib/service/WatchlistService";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { WATCHLIST_DI_TOKENS } from "../Watchlist.tokens";
import { watchlistModule } from "../modules/Watchlist.module";

export const watchlistContainer = createContainer();

prismaModuleLoader.loadModule(watchlistContainer);

watchlistContainer.load(SHARED_TOKENS.LOGGER, loggerServiceModule);
watchlistContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

watchlistContainer.load(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.AUDIT_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE, watchlistModule);

export function getWatchlistService() {
  return watchlistContainer.get<WatchlistService>(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE);
}

export function getGlobalBlockingService() {
  return watchlistContainer.get<GlobalBlockingService>(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE);
}

export function getOrganizationBlockingService() {
  return watchlistContainer.get<OrganizationBlockingService>(
    WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE
  );
}

export function getAuditService() {
  return watchlistContainer.get<WatchlistAuditService>(WATCHLIST_DI_TOKENS.AUDIT_SERVICE);
}

export function getGlobalWatchlistRepository() {
  return watchlistContainer.get<IGlobalWatchlistRepository>(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY);
}

export function getOrganizationWatchlistRepository() {
  return watchlistContainer.get<IOrganizationWatchlistRepository>(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  );
}

export async function getWatchlistFeature(): Promise<WatchlistFeature> {
  return createWatchlistFeature(watchlistContainer);
}
