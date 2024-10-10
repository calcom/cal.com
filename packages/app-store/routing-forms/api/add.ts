import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  createCredential: async ({ user, appType, slug, teamId }) => {
    return await CredentialRepository.create({
      type: appType,
      key: {},
      ...(teamId ? { teamId } : { userId: user.id }),
      appId: slug,
    });
  },
  redirect: {
    url: "/apps/routing-forms/forms",
  },
};

export default handler;
