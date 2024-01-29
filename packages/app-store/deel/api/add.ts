import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
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
    url: "https://go.cal.com/deel",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, userId: user.id, slug, key: {}, teamId }),
};

export default handler;
