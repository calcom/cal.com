import { calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
import {
  GOOGLE_CALENDAR_SCOPES,
  SCOPE_USERINFO_PROFILE,
  WEBAPP_URL,
  WEBAPP_URL_FOR_OAUTH,
} from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { updateProfilePhotoGoogle } from "../../_utils/oauth/updateProfilePhotoGoogle";
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

  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

  if (code) {
    const token = await oAuth2Client.getToken(code);
    const key = token.tokens;
    const grantedScopes = token.tokens.scope?.split(" ") ?? [];
    // Check if we have granted all required permissions
    const hasMissingRequiredScopes = GOOGLE_CALENDAR_SCOPES.some((scope) => !grantedScopes.includes(scope));
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

    oAuth2Client.setCredentials(key);

    const calendar = new calendar_v3.Calendar({
      auth: oAuth2Client,
    });

    // Get the primary calendar ID BEFORE creating the credential
    // to check if this calendar is already connected
    let primaryCalId: string | null | undefined = null;
    try {
      const calendarResponse = await calendar.calendars.get({ calendarId: "primary" });
      primaryCalId = calendarResponse.data.id;
    } catch {
      // If we can't get the primary calendar, proceed without duplicate check
      // The credential will still be created and user can configure later
    }

    // Check if this calendar is already connected to prevent duplicates
    if (primaryCalId) {
      const existingCalendar = await prisma.selectedCalendar.findFirst({
        where: {
          userId: req.session.user.id,
          externalId: primaryCalId,
          integration: "google_calendar",
        },
      });

      if (existingCalendar) {
        res.redirect(
          `${
            getSafeRedirectUrl(state?.onErrorReturnTo) ??
            getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
          }?error=account_already_linked`
        );
        return;
      }
    }

    const gcalCredential = await CredentialRepository.create({
      userId: req.session.user.id,
      key,
      appId: "google-calendar",
      type: "google_calendar",
    });

    const gCalService = new GoogleCalendarService({
      ...gcalCredential,
      user: null,
      delegatedTo: null,
    });

    const primaryCal = await gCalService.getPrimaryCalendar(calendar);

    // If we still don't have a primary calendar skip creating the selected calendar.
    // It can be toggled on later.
    if (!primaryCal?.id) {
      res.redirect(
        getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
      );
      return;
    }

    // Only attempt to update the user's profile photo if the user has granted the required scope
    if (grantedScopes.includes(SCOPE_USERINFO_PROFILE)) {
      await updateProfilePhotoGoogle(oAuth2Client, req.session.user.id);
    }

    const selectedCalendarWhereUnique = {
      userId: req.session.user.id,
      externalId: primaryCal.id,
      integration: "google_calendar",
    };

    // Wrapping in a try/catch to reduce chance of race conditions-
    // also this improves performance for most of the happy-paths.
    try {
      await gCalService.upsertSelectedCalendar({
        // First install should add a user-level selectedCalendar only.
        eventTypeId: null,
        externalId: selectedCalendarWhereUnique.externalId,
      });
    } catch (error) {
      let errorMessage = "something_went_wrong";
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // it is possible a selectedCalendar was orphaned, in this situation-
        // we want to recover by connecting the existing selectedCalendar to the new Credential.
        if (await renewSelectedCalendarCredentialId(selectedCalendarWhereUnique, gcalCredential.id)) {
          res.redirect(
            getSafeRedirectUrl(state?.returnTo) ??
              getInstalledAppPath({ variant: "calendar", slug: "google-calendar" })
          );
          return;
        }
        // else
        errorMessage = "account_already_linked";
      }
      await CredentialRepository.deleteById({ id: gcalCredential.id });
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

  const existingGoogleMeetCredential = await CredentialRepository.findFirstByUserIdAndType({
    userId: req.session.user.id,
    type: "google_video",
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
  await CredentialRepository.create({
    userId: req.session.user.id,
    type: "google_video",
    key: {},
    appId: "google-meet",
  });
  res.redirect(
    getSafeRedirectUrl(`${WEBAPP_URL}/apps/installed/conferencing?hl=google-meet`) ??
      getInstalledAppPath({ variant: "conferencing", slug: "google-meet" })
  );
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
