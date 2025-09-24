import { createModule } from "@evyweb/ioctopus";

import { BlockingService } from "../services/BlockingService";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const blockingServiceModule = createModule();

// Bind service directly - no need for strategy pattern
blockingServiceModule
  .bind(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE)
  .toClass(BlockingService, [
    WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY,
    WATCHLIST_DI_TOKENS.AUDIT_SERVICE,
  ]);
