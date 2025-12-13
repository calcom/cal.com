import { createModule } from "@evyweb/ioctopus";

import { KyselyQueuedFormResponseRepository } from "@calcom/app-store/routing-forms/lib/queuedFormResponse/KyselyQueuedFormResponseRepository";
import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { DI_TOKENS } from "../tokens";

export const queuedFormResponseRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.QUEUED_FORM_RESPONSE_REPOSITORY)
    .toInstance(new KyselyQueuedFormResponseRepository(kyselyRead, kyselyWrite));
  return module;
};
