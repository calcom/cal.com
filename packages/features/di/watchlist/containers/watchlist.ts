import { createContainer } from "@evyweb/ioctopus";

import { loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { taskerServiceModule } from "@calcom/features/di/shared/services/tasker.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { createWatchlistFeature } from "@calcom/features/watchlist/lib/facade/WatchlistFeature";
import type { PrismaClient } from "@calcom/prisma/client";

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
watchlistContainer.load(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE, watchlistModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE, watchlistModule);

export function getWatchlistService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE);
}

export function getGlobalBlockingService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE);
}

export function getOrganizationBlockingService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE);
}

export function getAuditService() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.AUDIT_SERVICE);
}

export function getGlobalWatchlistRepository() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY);
}

export function getOrganizationWatchlistRepository() {
  return watchlistContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY);
}

export async function getWatchlistFeature(prisma?: PrismaClient) {
  if (prisma) {
    // Create a test-specific container with the provided prisma
    const testContainer = createContainer();

    // Load shared infrastructure
    testContainer.load(SHARED_TOKENS.LOGGER, loggerServiceModule);
    testContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);

    // Create repositories with the provided prisma
    const { GlobalWatchlistRepository } = await import(
      "@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository"
    );
    const { OrganizationWatchlistRepository } = await import(
      "@calcom/features/watchlist/lib/repository/OrganizationWatchlistRepository"
    );
    const { AuditRepository } = await import("@calcom/features/watchlist/lib/repository/AuditRepository");
    const { GlobalBlockingService } = await import(
      "@calcom/features/watchlist/lib/service/GlobalBlockingService"
    );
    const { OrganizationBlockingService } = await import(
      "@calcom/features/watchlist/lib/service/OrganizationBlockingService"
    );
    const { WatchlistService } = await import("@calcom/features/watchlist/lib/service/WatchlistService");
    const { AuditService } = await import("@calcom/features/watchlist/lib/service/AuditService");

    // Bind repositories with the provided prisma
    testContainer
      .bind(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY)
      .toValue(new GlobalWatchlistRepository(prisma));
    testContainer
      .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
      .toValue(new OrganizationWatchlistRepository(prisma));
    testContainer.bind(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY).toValue(new AuditRepository(prisma));

    // Bind services
    testContainer
      .bind(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE)
      .toValue(
        new GlobalBlockingService(
          testContainer.get(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY),
          testContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
        )
      );
    testContainer
      .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
      .toValue(
        new OrganizationBlockingService(
          testContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
        )
      );
    testContainer
      .bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE)
      .toValue(new AuditService(testContainer.get(WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY)));
    testContainer
      .bind(WATCHLIST_DI_TOKENS.WATCHLIST_SERVICE)
      .toValue(
        new WatchlistService(
          testContainer.get(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY),
          testContainer.get(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY),
          testContainer.get(SHARED_TOKENS.LOGGER)
        )
      );

    return createWatchlistFeature(testContainer);
  }

  // Use the default container for production
  return createWatchlistFeature(watchlistContainer);
}
