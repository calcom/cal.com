import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { createDefaultInstallation } from "../../_utils/installation";
import { metadata } from "../metadata.generated";

const handler: AppDeclarativeHandler = {
  appType: metadata.type,
  variant: metadata.variant,
  slug: metadata.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    newTab: true,
    url: "https://cal.com/blog/cal-plus-vimcal",
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
};

export default handler;
