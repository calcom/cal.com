import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyWatchlistAuditRepository } from "../../watchlist/lib/repository/KyselyWatchlistAuditRepository";
import { DI_TOKENS } from "../tokens";

export const watchlistAuditRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.WATCHLIST_AUDIT_REPOSITORY)
    .toInstance(new KyselyWatchlistAuditRepository(kyselyRead, kyselyWrite));
  return module;
};
