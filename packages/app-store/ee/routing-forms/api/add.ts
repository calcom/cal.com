import prisma from "@calcom/prisma";
import { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import metadata from "../_metadata";

const handler: AppDeclarativeHandler = {
  // Instead of passing appType and slug from here, api/integrations/[..args] should be able to derive and pass these directly to createCredential
  appType: metadata.type,
  variant: metadata.variant,
  slug: metadata.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  createCredential: async ({ user, appType, slug }) => {
    return await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        userId: user.id,
        appId: slug,
      },
    });
  },
  redirect: {
    url: "/apps/routing-forms/forms",
  },
};

export default handler;
