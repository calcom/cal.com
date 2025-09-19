import { createModule } from "@evyweb/ioctopus";

import { BlockingService } from "../../services/BlockingService";
import { EmailBlockingStrategy, DomainBlockingStrategy } from "../../strategies";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const blockingServiceModule = createModule();

// Bind strategies
blockingServiceModule
  .bind(WATCHLIST_DI_TOKENS.EMAIL_BLOCKING_STRATEGY)
  .toClass(EmailBlockingStrategy, [WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY]);

blockingServiceModule
  .bind(WATCHLIST_DI_TOKENS.DOMAIN_BLOCKING_STRATEGY)
  .toClass(DomainBlockingStrategy, [WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY]);

// Bind service with strategy array factory
blockingServiceModule.bind(WATCHLIST_DI_TOKENS.BLOCKING_SERVICE).toFactory((container) => {
  const emailStrategy = container.get(WATCHLIST_DI_TOKENS.EMAIL_BLOCKING_STRATEGY);
  const domainStrategy = container.get(WATCHLIST_DI_TOKENS.DOMAIN_BLOCKING_STRATEGY);
  const auditService = container.get(WATCHLIST_DI_TOKENS.AUDIT_SERVICE);

  return new BlockingService([emailStrategy, domainStrategy], auditService);
});
