// import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
// import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";
// import appConfig from "../config.json";
// const handler: AppDeclarativeHandler = {
//   appType: appConfig.type,
//   variant: appConfig.variant,
//   slug: appConfig.slug,
//   supportsMultipleInstalls: false,
//   handlerType: "add",
//   createCredential: ({ appType, user, slug, teamId }) =>
//     createDefaultInstallation({ appType, user: user, slug, key: {}, teamId }),
// };
// export default handler;
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  const appType = config.type;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        userId: req.session.user.id,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        userId: req.session.user.id,
        appId: "hitpay",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for Alby");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: "/apps/hitpay/setup" });
}
