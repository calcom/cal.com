import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyOrganizationWatchlistRepository } from "../../watchlist/lib/repository/KyselyOrganizationWatchlistRepository";
import { DI_TOKENS } from "../tokens";

export function organizationWatchlistRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY).toValue(new KyselyOrganizationWatchlistRepository(kyselyRead, kyselyWrite));
  };
}
