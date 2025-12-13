import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyDelegationCredentialRepository } from "../../delegation-credentials/repositories/KyselyDelegationCredentialRepository";
import { DI_TOKENS } from "../tokens";

export function delegationCredentialRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.DELEGATION_CREDENTIAL_REPOSITORY).toValue(new KyselyDelegationCredentialRepository(kyselyRead, kyselyWrite));
  };
}
