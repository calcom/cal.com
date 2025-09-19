import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { IBlockingService } from "../interfaces/IBlockingService";
import type { IWatchlistRepository } from "../interfaces/IWatchlistRepositories";
import { auditServiceModule } from "../modules/audit";
import { blockingServiceModule } from "../modules/blocking";
import { watchlistRepositoryModule } from "../modules/watchlist";
import { WATCHLIST_DI_TOKENS } from "../tokens";

const container = createContainer();

// Load core modules
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

// Load watchlist modules
container.load(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY_MODULE, watchlistRepositoryModule);
container.load(WATCHLIST_DI_TOKENS.AUDIT_SERVICE_MODULE, auditServiceModule);
container.load(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE_MODULE, blockingServiceModule);

export function getBlockingService(): IBlockingService {
  return container.get<IBlockingService>(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE);
}

export function getWatchlistRepository(): IWatchlistRepository {
  return container.get<IWatchlistRepository>(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY);
}
