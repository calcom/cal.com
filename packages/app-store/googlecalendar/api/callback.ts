import type { Auth } from "googleapis";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { REQUIRED_SCOPES, SCOPE_USERINFO_PROFILE } from "../lib/constants";
import { getGoogleAppKeys } from "../lib/getGoogleAppKeys";

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

  const { client_id, client_secret } = await getGoogleAppKeys();

  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  let key;

  if (code) {
    const token = await oAuth2Client.getToken(code);
    key = token.tokens;
    const grantedScopes = token.tokens.scope?.split(" ") ?? [];
    // Check if we have granted all required permissions
    const hasMissingRequiredScopes = REQUIRED_SCOPES.some((scope) => !grantedScopes.includes(scope));
    if (hasMissingRequiredScopes) {
      if (!state?.fromApp) {
        throw new HttpError({
          statusCode: 400,
          message: "You must grant all permissions to use this integration",
        });
      }
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }

    // Set the primary calendar as the first selected calendar

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

    // Only attempt to update the user's profile photo if the user has granted the required scope
    if (grantedScopes.includes(SCOPE_USERINFO_PROFILE)) {
      await updateProfilePhoto(oAuth2Client, req.session.user.id);
    }

    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key,
        userId: req.session.user.id,
        appId: "google-calendar",
      },
    });

    const selectedCalendarWhereUnique = {
      userId: req.session.user.id,
      externalId: primaryCal.id,
      integration: "google_calendar",
    };

    // Wrapping in a try/catch to reduce chance of race conditions-
    // also this improves performance for most of the happy-paths.
    try {
      await prisma.selectedCalendar.create({
        data: {
          credentialId: credential.id,
          ...selectedCalendarWhereUnique,
        },
      });
    } catch (error) {
      let errorMessage = "something_went_wrong";
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // it is possible a selectedCalendar was orphaned, in this situation-
        // we want to recover by connecting the existing selectedCalendar to the new Credential.
        if (await renewSelectedCalendarCredentialId(selectedCalendarWhereUnique, credential.id)) {
          res.redirect(
            getSafeRedirectUrl(state?.returnTo) ??
              getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
          );
          return;
        }
        // else
        errorMessage = "account_already_linked";
      }
      await prisma.credential.delete({ where: { id: credential.id } });
      res.redirect(
        `${
          getSafeRedirectUrl(state?.onErrorReturnTo) ??
          getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
        }?error=${errorMessage}`
      );
      return;
    }
  }

  // No need to install? Redirect to the returnTo URL
  if (!state?.installGoogleVideo) {
    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ??
        getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
    );
    return;
  }

  const existingGoogleMeetCredential = await prisma.credential.findFirst({
    where: {
      userId: req.session.user.id,
      type: "google_video",
    },
  });

  // If the user already has a google meet credential, there's nothing to do in here
  if (existingGoogleMeetCredential) {
    res.redirect(
      getSafeRedirectUrl(`${WEBAPP_URL}/apps/installed/conferencing?hl=google-meet`) ??
        getInstalledAppPath({ variant: "conferencing", slug: "google-meet" })
    );
    return;
  }

  // Create a new google meet credential
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

async function updateProfilePhoto(oAuth2Client: Auth.OAuth2Client, userId: number) {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    if (userDetails.data?.picture) {
      // Using updateMany here since if the user already has a profile it would throw an error because no records were found to update the profile picture
      await prisma.user.updateMany({
        where: { id: userId, avatarUrl: null },
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
