import { createModule } from "@evyweb/ioctopus";

import { OrganizationWatchlistRepository } from "../repositories/OrganizationWatchlistRepository";
import { OrganizationBlockingService } from "../services/OrganizationBlockingService";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const organizationServicesModule = createModule();

// Bind organization watchlist repository
organizationServicesModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY)
  .toClass(OrganizationWatchlistRepository, ["PRISMA_CLIENT"]);

// Bind organization blocking service
organizationServicesModule
  .bind(WATCHLIST_DI_TOKENS.ORGANIZATION_BLOCKING_SERVICE)
  .toClass(OrganizationBlockingService, [
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY,
    WATCHLIST_DI_TOKENS.AUDIT_SERVICE,
  ]);
