import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAttributeToUserRepository } from "@calcom/lib/server/repository/KyselyAttributeToUserRepository";

import { DI_TOKENS } from "../tokens";

export const attributeToUserRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ATTRIBUTE_TO_USER_REPOSITORY)
    .toInstance(new KyselyAttributeToUserRepository(kyselyRead, kyselyWrite));
  return module;
};
