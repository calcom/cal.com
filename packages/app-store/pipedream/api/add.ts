import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    newTab: true,
    url: "https://pipedream.com/apps/cal-com",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
