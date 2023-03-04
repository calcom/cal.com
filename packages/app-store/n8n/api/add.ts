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
    url: "https://n8n.io/integrations/cal-trigger/",
    newTab: true,
  },
  createCredential: ({ appType, user, slug }) =>
    createDefaultInstallation({ appType, userId: user.id, slug, key: {} }),
};

export default handler;
