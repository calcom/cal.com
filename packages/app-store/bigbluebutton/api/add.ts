import type { NextApiRequest, NextApiResponse } from "next";

import checkSession from "@calcom/app-store/_utils/auth";
import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import appConfig from "../config.json";
import { BbbApi, bbbOptionsSchema } from "../lib/bbbApi";

const getHandler = async () => {
  return { url: "/apps/bigbluebutton/setup" };
};

const postHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return res
      .status(500)
      .json({ error: "Missing Cal.com encryption key. Please contact the server admin." });
  }

  const session = checkSession(req);
  const opts = bbbOptionsSchema.parse(req.body);

  const bbbApi = new BbbApi(opts);

  const credentialCheck = await bbbApi.checkCredentials();
  if (!credentialCheck.success) {
    return res.status(500).json({ message: credentialCheck.reason });
  }

  const { slug, variant, type: appType } = appConfig;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;

  try {
    await checkInstalled(slug, session.user.id);
    await createDefaultInstallation({
      appType,
      user: {
        id: session.user.id,
      },
      slug,
      key: symmetricEncrypt(JSON.stringify(opts), process.env.CALENDSO_ENCRYPTION_KEY),
      teamId,
    });
  } catch (reason) {
    logger.error("Could not add this app:", reason);
    return res
      .status(500)
      .json({ message: "Unexpected error, but credentials are valid. Check server logs for details." });
  }

  return { url: getInstalledAppPath({ variant, slug }) };
};

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
