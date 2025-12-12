import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAppRepository } from "@calcom/lib/server/repository/KyselyAppRepository";

import { DI_TOKENS } from "../tokens";

export const appRepositoryModuleLoader = () => {
  const module = createModule();
  module.bind(DI_TOKENS.APP_REPOSITORY).toInstance(new KyselyAppRepository(kyselyRead, kyselyWrite));
  return module;
};
