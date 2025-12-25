import type { NextApiRequest } from "next";

import checkSession from "@calcom/app-store/_utils/auth";
import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { checkInstalled } from "@calcom/app-store/_utils/installation";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import metadata from "../_metadata";
import { BBBApi } from "../lib/bbbapi";
import { bbbOptionsSchema } from "../lib/types";

async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  await checkInstalled(metadata.slug, session.user?.id);
  return { url: "/apps/bigbluebutton/setup", newTab: true };
}

async function postHandler(req: NextApiRequest) {
  const session = checkSession(req);
  await checkInstalled(metadata.slug, session.user?.id);
  const body = req.body;
  const teamIdParam = req.query.teamId;
  const teamId = teamIdParam && !isNaN(Number(teamIdParam)) ? Number(teamIdParam) : undefined;

  const schema = bbbOptionsSchema.safeParse(body);
  if (!schema.success) {
    throw new HttpError({ statusCode: 400, message: "Invalid BigBlueButton options" });
  }

  const client = new BBBApi(schema.data);
  const valid = await client.checkValidOptions();
  if (!valid) {
    throw new HttpError({
      statusCode: 400,
      message: "Invalid BigBlueButton options",
    });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    logger.error("Missing encryption key; cannot proceed with BigBlueButton setup.");
    throw new HttpError({
      statusCode: 500,
    });
  }

  let encrypted;
  try {
    encrypted = symmetricEncrypt(JSON.stringify(schema.data), process.env.CALENDSO_ENCRYPTION_KEY);
  } catch (reason) {
    logger.error("Could not add BigBlueButton app", reason);
    throw new HttpError({
      statusCode: 500,
      message: "Something went wrong while encrypting your BigBlueButton options",
    });
  }

  const json = {
    private: encrypted,
  };

  await createDefaultInstallation({
    appType: metadata.type,
    slug: metadata.slug,
    user: {
      id: session.user?.id,
    },
    key: json,
    teamId,
  });

  return { url: getInstalledAppPath({ variant: metadata.variant, slug: metadata.slug }) };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
