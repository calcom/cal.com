import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { baseApiUrl } from "../api/callback";
import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  redirect: {
    newTab: true,
    url: `${baseApiUrl}`,
  },
  handlerType: "add",
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
