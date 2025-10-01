import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { IBlockingService } from "../interfaces/IBlockingService";
import type {
  IWatchlistRepository,
  IWatchlistReadRepository,
  IWatchlistWriteRepository,
} from "../interfaces/IWatchlistRepositories";
import { auditServiceModule } from "../modules/audit";
import { blockingServiceModule } from "../modules/booking";
import { globalServicesModule } from "../modules/global";
import { organizationServicesModule } from "../modules/organization";
import { watchlistRepositoryModule } from "../modules/watchlist";
import type { GlobalBlockingService } from "../services/GlobalBlockingService";
import type { OrganizationBlockingService } from "../services/OrganizationBlockingService";
import { WATCHLIST_DI_TOKENS } from "../tokens";

const container = createContainer();

// Load core modules
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

// Load watchlist modules
container.load(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY_MODULE, watchlistRepositoryModule);
container.load(WATCHLIST_DI_TOKENS.AUDIT_SERVICE_MODULE, auditServiceModule);
container.load(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE_MODULE, blockingServiceModule);

// Load new separated service modules
container.load(WATCHLIST_DI_TOKENS.GLOBAL_SERVICES_MODULE, globalServicesModule);
container.load(WATCHLIST_DI_TOKENS.ORGANIZATION_SERVICES_MODULE, organizationServicesModule);

export function getBlockingService(): IBlockingService {
  return container.get<IBlockingService>(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE);
}

export function getWatchlistRepository(): IWatchlistRepository {
  return container.get<IWatchlistRepository>(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY);
}

export function getWatchlistReadRepository(): IWatchlistReadRepository {
  return container.get<IWatchlistReadRepository>(WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY);
}

export function getWatchlistWriteRepository(): IWatchlistWriteRepository {
  return container.get<IWatchlistWriteRepository>(WATCHLIST_DI_TOKENS.WATCHLIST_WRITE_REPOSITORY);
}

// New separated service getters
export function getGlobalBlockingService(): GlobalBlockingService {
  return container.get<GlobalBlockingService>(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE);
}

export function getOrganizationBlockingService(): OrganizationBlockingService {
  return container.get<OrganizationBlockingService>(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE);
}
