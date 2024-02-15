import type { Auth } from "googleapis";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH, WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { scopes } from "./add";

let client_id = "";
let client_secret = "";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("google-calendar");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) throw new HttpError({ statusCode: 400, message: "Google client_id missing." });
  if (!client_secret) throw new HttpError({ statusCode: 400, message: "Google client_secret missing." });

  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  let key;

  if (code) {
    const token = await oAuth2Client.getToken(code);
    key = token.res?.data;

    // Check that the has granted all permissions
    const grantedScopes = key.scope;
    for (const scope of scopes) {
      if (!grantedScopes.includes(scope)) {
        if (!state?.fromApp) {
          throw new HttpError({
            statusCode: 400,
            message: "You must grant all permissions to use this integration",
          });
        } else {
          res.redirect(
            getSafeRedirectUrl(state.onErrorReturnTo) ??
              getSafeRedirectUrl(state?.returnTo) ??
              `${WEBAPP_URL}/apps/installed`
          );
          return;
        }
      }
    }

    // Set the primary calendar as the first selected calendar

    // We can ignore this type error because we just validated the key when we init oAuth2Client
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    oAuth2Client.setCredentials(key);

    const calendar = google.calendar({
      version: "v3",
      auth: oAuth2Client,
    });

    const cals = await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" });
    const primaryCal = cals.data.items?.find((cal) => cal.primary);
    // Primary calendar won't be null, this check satisfies typescript.
    if (!primaryCal?.id) {
      throw new HttpError({ message: "Internal Error", statusCode: 500 });
    }

    // Update the user's profile photo with google profile photo if it's null
    // Since we don't want to block the user from using the app if this fails, we don't await this
    updateProfilePhoto(oAuth2Client, req.session.user.id);

    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key,
        userId: req.session.user.id,
        appId: "google-calendar",
      },
    });
    // Wrapping in a try/catch to reduce chance of race conditions-
    // also this improves performance for most of the happy-paths.
    try {
      await prisma.selectedCalendar.create({
        data: {
          userId: req.session.user.id,
          externalId: primaryCal.id,
          credentialId: credential.id,
          integration: "google_calendar",
        },
      });
    } catch (error) {
      await prisma.credential.delete({ where: { id: credential.id } });
      let errorMessage = "something_went_wrong";
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        errorMessage = "account_already_linked";
      }
      res.redirect(
        `${
          getSafeRedirectUrl(state?.onErrorReturnTo) ??
          getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
        }?error=${errorMessage}`
      );
      return;
    }
  }

  if (state?.installGoogleVideo) {
    const existingGoogleMeetCredential = await prisma.credential.findFirst({
      where: {
        userId: req.session.user.id,
        type: "google_video",
      },
    });

    if (!existingGoogleMeetCredential) {
      await prisma.credential.create({
        data: {
          type: "google_video",
          key: {},
          userId: req.session.user.id,
          appId: "google-meet",
        },
      });

      res.redirect(
        getSafeRedirectUrl(`${WEBAPP_URL}/apps/installed/conferencing?hl=google-meet`) ??
          getInstalledAppPath({ variant: "conferencing", slug: "google-meet" })
      );
    }
  }
  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
  );
}

async function updateProfilePhoto(oAuth2Client: Auth.OAuth2Client, userId: number) {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    if (userDetails.data?.picture) {
      await prisma.user.update({
        where: { id: userId, avatarUrl: null, avatar: null },
        data: {
          avatarUrl: userDetails.data.picture,
        },
      });
    }
  } catch (error) {
    logger.error("Error updating avatarUrl from google calendar connect", error);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
