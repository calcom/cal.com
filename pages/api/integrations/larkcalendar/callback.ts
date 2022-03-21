import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { CALENDAR_INTEGRATIONS_TYPES } from "@lib/integrations/calendar/constants/generals";
import { LarkAuthCredentials } from "@lib/integrations/calendar/interfaces/LarkCalendar";
import larkAppCredential from "@lib/integrations/calendar/services/LarkCalendarService/AppCredential";
import { LARK_HOST } from "@lib/integrations/calendar/services/LarkCalendarService/helper";
import logger from "@lib/logger";
import prisma from "@lib/prisma";

import { decodeOAuthState } from "../utils";

const log = logger.getChildLogger({ prefix: [`[[callback] ${CALENDAR_INTEGRATIONS_TYPES.lark}`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  log.debug("call back entrance code", code);

  // Check that user is authenticated
  const session = await getSession({ req: req });
  if (!session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }
  if (typeof code !== "string") {
    res.status(400).json({ message: "No code returned" });
    return;
  }

  try {
    const accessToken = await larkAppCredential.getAppAccessToken();
    log.debug("get accessToken", accessToken);

    const response = await fetch(`https://${LARK_HOST}/open-apis/authen/v1/access_token`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!response.ok) {
      log.debug("get user_access_token failed", response);
      log.error("get user_access_token failed");
      return res.redirect("/integrations?error=" + JSON.stringify(response));
    }

    const responseBody = await response.json();
    log.debug("user access_token responseBody", responseBody);

    if (responseBody.code !== 0) {
      log.error("get user_access_token failed with none 0 code", responseBody);
      return res.redirect("/integrations?error=" + JSON.stringify(responseBody));
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
        userId: session.user.id,
        type: CALENDAR_INTEGRATIONS_TYPES.lark,
      },
    });

    if (!currentCredential) {
      await prisma.credential.create({
        data: {
          type: CALENDAR_INTEGRATIONS_TYPES.lark,
          key,
          userId: session.user.id,
        },
      });
    } else {
      await prisma.credential.update({
        data: {
          type: CALENDAR_INTEGRATIONS_TYPES.lark,
          key,
          userId: session.user.id,
        },
        where: {
          id: currentCredential.id,
        },
      });
    }
  } catch (error) {
    log.error("handle callback error", error);
    const state = decodeOAuthState(req);
    return res.redirect(state?.returnTo ?? "/integrations");
  }

  const state = decodeOAuthState(req);
  return res.redirect(state?.returnTo ?? "/integrations");
}
