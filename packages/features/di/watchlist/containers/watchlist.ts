import { createContainer } from "@evyweb/ioctopus";

import { loggerServiceModule } from "@calcom/lib/di/shared/services/logger.service";
import { taskerServiceModule } from "@calcom/lib/di/shared/services/tasker.service";
import { SHARED_TOKENS } from "@calcom/lib/di/shared/shared.tokens";

import { watchlistModule } from "../modules/Watchlist.module";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const watchlistContainer = createContainer();

// Load shared infrastructure
watchlistContainer.load(SHARED_TOKENS.LOGGER, loggerServiceModule);
watchlistContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

// Load watchlist module
watchlistContainer.load(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.AUDIT_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE, watchlistModule);

// Service getters
export function getWatchlistService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE);
}

// Removed getWatchlistRepository() - use specialized repositories directly

export function getBlockingService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE);
}

export function getAuditService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.AUDIT_SERVICE);
}

export function getOrganizationBlockingService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE);
}

export function getGlobalWatchlistRepository() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY);
}

export function getOrganizationWatchlistRepository() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY);
}
