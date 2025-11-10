import type { NextApiRequest } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);

  const { api_key } = req.body;
  if (!api_key) throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "No Api Key provided to check");

  let encrypted;
  try {
    encrypted = symmetricEncrypt(JSON.stringify({ api_key }), process.env.CALENDSO_ENCRYPTION_KEY || "");
  } catch (reason) {
    logger.error("Could not add Sendgrid app", reason);
    throw new ErrorWithCode(ErrorCode.InternalServerError, "Invalid length - CALENDSO_ENCRYPTION_KEY");
  }

  const data = {
    type: "sendgrid_other_calendar",
    key: { encrypted },
    userId: session.user?.id,
    appId: "sendgrid",
  };

  try {
    await prisma.credential.create({
      data,
    });
  } catch (reason) {
    logger.error("Could not add Sendgrid app", reason);
    throw new ErrorWithCode(ErrorCode.InternalServerError, "Could not add Sendgrid app");
  }

  return { url: getInstalledAppPath({ variant: "other", slug: "sendgrid" }) };
}

export default defaultResponder(getHandler);
