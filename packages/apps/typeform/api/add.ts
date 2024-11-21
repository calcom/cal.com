import { createDefaultInstallation } from "@calcom/app-store-core/_utils/installation";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  slug: appConfig.slug,
  variant: appConfig.variant,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    url: "/apps/typeform/how-to-use",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
