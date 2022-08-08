import { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  // Instead of passing appType and slug from here, api/integrations/[..args] should be able to derive and pass these directly to createCredential
  appType: appConfig.type,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirectUrl: "/apps/typeform/how-to-use",
  createCredential: ({ appType, user, slug }) =>
    createDefaultInstallation({ appType, userId: user.id, slug, key: {} }),
};

export default handler;
