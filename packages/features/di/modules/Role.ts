import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyRoleRepository } from "../../pbac/infrastructure/repositories/KyselyRoleRepository";
import { DI_TOKENS } from "../tokens";

export function roleRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.ROLE_REPOSITORY).toValue(new KyselyRoleRepository(kyselyRead, kyselyWrite));
  };
}
