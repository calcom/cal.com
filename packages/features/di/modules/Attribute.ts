import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAttributeRepository } from "@calcom/lib/server/repository/KyselyAttributeRepository";

import { DI_TOKENS } from "../tokens";

export const attributeRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ATTRIBUTE_REPOSITORY)
    .toInstance(new KyselyAttributeRepository(kyselyRead, kyselyWrite));
  return module;
};
