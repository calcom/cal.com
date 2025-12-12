import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyApiKeyRepository } from "@calcom/lib/server/repository/KyselyApiKeyRepository";

import { DI_TOKENS } from "../tokens";

export const apiKeyRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.API_KEY_REPOSITORY)
    .toInstance(new KyselyApiKeyRepository(kyselyRead, kyselyWrite));
  return module;
};
