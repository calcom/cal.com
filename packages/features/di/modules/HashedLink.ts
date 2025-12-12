import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyHashedLinkRepository } from "@calcom/lib/server/repository/KyselyHashedLinkRepository";

import { DI_TOKENS } from "../tokens";

export const hashedLinkRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.HASHED_LINK_REPOSITORY)
    .toInstance(new KyselyHashedLinkRepository(kyselyRead, kyselyWrite));
  return module;
};
