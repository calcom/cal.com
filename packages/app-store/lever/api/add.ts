import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import config from "../config.json";

export const baseUrl = "https://api.sandbox.lever.co/v1/";
export const authorizationUrl = "https://sandbox-lever.auth0.com/authorize'";
export const accessTokenUrl = "https://sandbox-lever.auth0.com/oauth/token";

let client_id = "";

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        appId: "lever",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for Lever");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  const appKeys = await getAppKeysFromSlug("lever");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "Lever client_id missing." });

  const state = encodeOAuthState(req);

  /** @link https://hire.lever.co/developer/documentation#authentication **/
  const params = {
    client_id,
    redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/lever/callback`,
    response_type: "code",
    state,
    audience: baseUrl,
    scope: "offline_access opportunities:read:admin contact:read:admin",
  };
  const query = stringify(params);
  const authorizationUri = `${authorizationUrl}?${query}`;
  return authorizationUri;
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
