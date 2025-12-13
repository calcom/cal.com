import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyPhoneNumberRepository } from "@calcom/lib/server/repository/KyselyPhoneNumberRepository";

import { DI_TOKENS } from "../tokens";

export const phoneNumberRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.PHONE_NUMBER_REPOSITORY)
    .toInstance(new KyselyPhoneNumberRepository(kyselyRead, kyselyWrite));
  return module;
};
