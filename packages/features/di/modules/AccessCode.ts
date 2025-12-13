import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyAccessCodeRepository } from "../../oauth/repositories/KyselyAccessCodeRepository";
import { DI_TOKENS } from "../tokens";

export function accessCodeRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.ACCESS_CODE_REPOSITORY).toValue(new KyselyAccessCodeRepository(kyselyRead, kyselyWrite));
  };
}
