import type { NextApiRequest } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);

  const { api_key } = req.body;
  if (!api_key) throw new HttpError({ statusCode: 400, message: "No API key provided" });

  let encrypted;
  try {
    encrypted = symmetricEncrypt(JSON.stringify({ api_key }), process.env.CALENDSO_ENCRYPTION_KEY || "");
  } catch (reason) {
    logger.error("Could not add Lyra app", reason);
    throw new HttpError({ statusCode: 500, message: "Invalid encryption key" });
  }

  const data = {
    type: "lyra_video",
    key: { encrypted },
    userId: session.user?.id,
    appId: "lyra",
  };

  try {
    await prisma.credential.create({
      data,
    });
  } catch (reason) {
    logger.error("Could not add Lyra app", reason);
    throw new HttpError({ statusCode: 500, message: "Could not add Lyra app" });
  }

  return { url: getInstalledAppPath({ variant: "conferencing", slug: "lyra" }) };
}

export default defaultResponder(getHandler);
