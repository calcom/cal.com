import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { createDefaultInstallation } from "../../_utils/installation";
import { metadata } from "../metadata.generated";

const handler: AppDeclarativeHandler = {
  appType: metadata.type,
  slug: metadata.slug,
  variant: metadata.variant,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    url: "raycast://extensions/eluce2/cal-com-share-meeting-links?source=webstore",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
