import type { NextApiRequest, NextApiResponse } from "next";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";
import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import appConfig from "../config.json";

import prisma from "@calcom/prisma";

const handler: AppDeclarativeHandler = {
  appType: appConfig.type,
  variant: appConfig.variant,
  slug: appConfig.slug,
  supportsMultipleInstalls: false,
  handlerType: "add",
  redirect: {
    newTab: true,
    url: "/apps/zapier/setup",
  },
  createCredential: ({ appType, user, slug, teamId, calIdTeamId }) =>
    createDefaultInstallation({ appType, user: user, slug, key: {}, teamId, calIdTeamId }),
};

export default handler;
