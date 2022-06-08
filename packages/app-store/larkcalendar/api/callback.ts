import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";
import { LarkAuthCredentials, LARK_HOST } from "../common";
import { getAppAccessToken } from "../lib/AppAccessToken";

const log = logger.getChildLogger({ prefix: [`[[lark/api/callback]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (typeof code !== "string") {
    res.status(400).json({ message: "No code returned" });
    return;
  }

  const state = decodeOAuthState(req);

  try {
    const appAccessToken = await getAppAccessToken();

    const response = await fetch(`https://${LARK_HOST}/open-apis/authen/v1/access_token`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + appAccessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
      }),
    });

    const responseBody = await response.json();

    if (!response.ok || responseBody.code !== 0) {
      log.error("get user_access_token failed with none 0 code", responseBody);
      return res.redirect("/apps/installed?error=" + JSON.stringify(responseBody));
    }

    const key: LarkAuthCredentials = {
      expiry_date: Math.round(+new Date() / 1000 + responseBody.data.expires_in),
      access_token: responseBody.data.access_token,
      refresh_token: responseBody.data.refresh_token,
      refresh_expires_date: Math.round(+new Date() / 1000 + responseBody.data.refresh_expires_in),
    };

    /**
     * A user can have only one pair of refresh_token and access_token effective
     * at same time. Newly created  refresh_token and access_token will invalidate
     * older ones. So we need to keep only one lark credential per user only.
     * A user may connect many times, since both userId and type are
     * not unique in schema, so we cannot use upsert
     */
    const currentCredential = await prisma.credential.findFirst({
      where: {
        userId: req.session?.user.id,
        type: "lark_calendar",
      },
    });

    if (!currentCredential) {
      await prisma.credential.create({
        data: {
          type: "lark_calendar",
          key,
          userId: req.session?.user.id,
          appId: "lark-calendar",
        },
      });
    } else {
      await prisma.credential.update({
        data: {
          type: "lark_calendar",
          key,
          userId: req.session?.user.id,
          appId: "lark-calendar",
        },
        where: {
          id: currentCredential.id,
        },
      });
    }

    return res.redirect(getSafeRedirectUrl(state?.returnTo) ?? "/apps/installed");
  } catch (error) {
    log.error("handle callback error", error);
    return res.redirect(state?.returnTo ?? "/apps/installed");
  }
}
