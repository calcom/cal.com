import type { Prisma } from "@prisma/client";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { symmetricEncrypt } from "@calcom/lib/crypto";
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
    url: `/apps/${appConfig.slug}/setup`,
  },
  createCredential: ({ appType, user, slug, teamId }) =>
    createDefaultInstallation({
      appType,
      userId: user.id,
      slug,
      keysCustomFunc: (arg0: Prisma.JsonObject) =>
        symmetricEncrypt(JSON.stringify(arg0), process.env.CALENDSO_ENCRYPTION_KEY),
      useAppKeys: true,
      teamId,
    }),
};

export default handler;
