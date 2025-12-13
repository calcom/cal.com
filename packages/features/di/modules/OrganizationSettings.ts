import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyOrganizationSettingsRepository } from "../../organizations/repositories/KyselyOrganizationSettingsRepository";
import { DI_TOKENS } from "../tokens";

export function organizationSettingsRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.ORGANIZATION_SETTINGS_REPOSITORY).toValue(new KyselyOrganizationSettingsRepository(kyselyRead, kyselyWrite));
  };
}
