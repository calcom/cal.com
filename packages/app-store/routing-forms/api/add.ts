import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

const handler: AppDeclarativeHandler = {
  appType: "routing-forms_other",
  variant: "other",
  slug: "routing-forms",
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
