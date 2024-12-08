import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { metadata } from "../metadata.generated";

const handler: AppDeclarativeHandler = {
  appType: metadata.type,
  variant: metadata.variant,
  slug: metadata.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    newTab: true,
    url: "https://example.com/link",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
