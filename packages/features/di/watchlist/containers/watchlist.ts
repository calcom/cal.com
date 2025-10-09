import { createContainer } from "@evyweb/ioctopus";
import type { Container } from "@evyweb/ioctopus";

import { loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { taskerServiceModule } from "@calcom/features/di/shared/services/tasker.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { createWatchlistFeature } from "@calcom/features/watchlist/lib/facade/WatchlistFeature";
import type { PrismaClient } from "@calcom/prisma/client";
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

export async function getWatchlistFeature(containerOrPrisma?: Container | PrismaClient) {
  if (containerOrPrisma && "get" in containerOrPrisma) {
    return createWatchlistFeature(containerOrPrisma);
  }

  if (containerOrPrisma) {
    // For tests, create services directly without DI container complexity
    const prisma = containerOrPrisma as PrismaClient;
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

    // Create repositories with test prisma
    const globalRepo = new GlobalWatchlistRepository(prisma);
    const orgRepo = new OrganizationWatchlistRepository(prisma);
    const auditRepo = new AuditRepository(prisma);

    return {
      globalBlocking: new GlobalBlockingService({ globalRepo }),
      orgBlocking: new OrganizationBlockingService({ orgRepo }),
      watchlist: new WatchlistService({ globalRepo, orgRepo }),
      audit: new AuditService({ auditRepository: auditRepo }),
    };
  }

  return createWatchlistFeature(watchlistContainer);
}
