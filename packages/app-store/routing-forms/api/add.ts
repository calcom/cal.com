import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
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
    const credential = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...(teamId ? { teamId } : { userId: user.id }),
        appId: slug,
      },
    });
    await BookingReferenceRepository.reconnectWithNewCredential(credential.id);
    return credential;
  },
  redirect: {
    url: "/apps/routing-forms/forms",
  },
};

export default handler;
