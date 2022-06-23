import prisma from "@calcom/prisma";

import appConfig from "../config.json";

const handler = {
  // Instead of passing appType and slug from here, api/integrations/[..args] should be able to derive and pass these directly to createCredential
  appType: appConfig.type,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
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
  redirectUrl: "/apps/routing_forms/forms",
};

export default handler;
