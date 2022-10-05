import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { LARK_HOST } from "../common";
import { getAppAccessToken } from "../lib/AppAccessToken";
import type { LarkAuthCredentials } from "../types/LarkCalendar";

const log = logger.getChildLogger({ prefix: [`[[lark/api/callback]`] });

const callbackQuerySchema = z.object({
  code: z.string().min(1),
});

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = callbackQuerySchema.parse(req.query);
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
     * However, a user may connect many times, since both userId and type are
     * not unique in schema, so we have to use credential id as index for looking
     * for the unique access_token token. In this case, id does not exist before created, so we cannot use credential id (which may not exist) as where statement
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

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ??
        getInstalledAppPath({ variant: "calendar", slug: "lark-calendar" })
    );
  } catch (error) {
    log.error("handle callback error", error);
    res.redirect(state?.returnTo ?? "/apps/installed");
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
