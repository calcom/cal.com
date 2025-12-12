import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAttributeOptionRepository } from "@calcom/lib/server/repository/KyselyAttributeOptionRepository";

import { DI_TOKENS } from "../tokens";

export const attributeOptionRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ATTRIBUTE_OPTION_REPOSITORY)
    .toInstance(new KyselyAttributeOptionRepository(kyselyRead, kyselyWrite));
  return module;
};
