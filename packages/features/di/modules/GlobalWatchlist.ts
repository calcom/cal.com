import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyGlobalWatchlistRepository } from "../../watchlist/lib/repository/KyselyGlobalWatchlistRepository";
import { DI_TOKENS } from "../tokens";

export function globalWatchlistRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY).toValue(new KyselyGlobalWatchlistRepository(kyselyRead, kyselyWrite));
  };
}
