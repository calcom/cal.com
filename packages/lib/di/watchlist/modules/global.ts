import { createModule } from "@evyweb/ioctopus";

import { GlobalWatchlistRepository } from "../repositories/GlobalWatchlistRepository";
import { GlobalBlockingService } from "../services/GlobalBlockingService";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const globalServicesModule = createModule();

// Bind global watchlist repository
globalServicesModule
  .bind(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY)
  .toClass(GlobalWatchlistRepository, ["PRISMA_CLIENT"]);

// Bind global blocking service
globalServicesModule
  .bind(WATCHLIST_DI_TOKENS.GLOBAL_BLOCKING_SERVICE)
  .toClass(GlobalBlockingService, [WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY]);
