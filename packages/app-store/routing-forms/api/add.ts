import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";
import appConfig from "../config.json";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  createCredential: async ({ user, appType, slug, teamId }) => {
    return await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...(teamId ? { teamId } : { userId: user.id }),
        appId: slug,
      },
    });
  },
  redirect: {
    url: "/apps/routing-forms/forms",
  },
};

export default handler;
