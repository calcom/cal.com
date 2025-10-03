import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { ONEHASH_CHAT_INTEGRATION_PAGE } from "@calcom/lib/constants";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    newTab: true,
    url: ONEHASH_CHAT_INTEGRATION_PAGE,
  },
  createCredential: ({ appType, user, slug, teamId, calIdTeamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId, calIdTeamId }),
};

export default handler;
