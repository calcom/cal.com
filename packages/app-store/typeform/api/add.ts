import { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { createDefaultInstallation } from "../../_utils/installation";
import metadata from "../_metadata";

const handler: AppDeclarativeHandler = {
  // Instead of passing appType and slug from here, api/integrations/[..args] should be able to derive and pass these directly to createCredential
  appType: metadata.type,
  slug: metadata.slug,
  variant: metadata.variant,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    url: "/apps/typeform/how-to-use",
  },
  createCredential: ({ appType, user, slug }) =>
    createDefaultInstallation({ appType, userId: user.id, slug, key: {} }),
};

export default handler;
