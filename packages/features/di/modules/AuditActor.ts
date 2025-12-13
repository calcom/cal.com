import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyAuditActorRepository } from "../../booking-audit/lib/repository/KyselyAuditActorRepository";
import { DI_TOKENS } from "../tokens";

export const auditActorRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.AUDIT_ACTOR_REPOSITORY)
    .toInstance(new KyselyAuditActorRepository(kyselyRead, kyselyWrite));
  return module;
};
