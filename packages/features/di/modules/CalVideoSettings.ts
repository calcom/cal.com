import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyCalVideoSettingsRepository } from "@calcom/lib/server/repository/KyselyCalVideoSettingsRepository";

import { DI_TOKENS } from "../tokens";

export const calVideoSettingsRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.CAL_VIDEO_SETTINGS_REPOSITORY)
    .toInstance(new KyselyCalVideoSettingsRepository(kyselyRead, kyselyWrite));
  return module;
};
