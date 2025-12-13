import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyPermissionRepository } from "../../pbac/infrastructure/repositories/KyselyPermissionRepository";
import { DI_TOKENS } from "../tokens";

export function permissionRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.PERMISSION_REPOSITORY).toValue(new KyselyPermissionRepository(kyselyRead, kyselyWrite));
  };
}
