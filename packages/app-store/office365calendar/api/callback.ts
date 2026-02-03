import type { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import type { NextApiRequest, NextApiResponse } from "next";

import { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { handleErrorsJson } from "@calcom/lib/errors";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    res.status(400).json({ message: "No code returned" });
    return;
  }

  let clientId = "";
  let clientSecret = "";
  const appKeys = await getAppKeysFromSlug("office365-calendar");
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) return res.status(400).json({ message: "Office 365 client_id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Office 365 client_secret missing." });

  const toUrlEncoded = (payload: Record<string, string>) =>
    Object.keys(payload)
      .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
      .join("&");

  const body = toUrlEncoded({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    scope: scopes.join(" "),
    redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/office365calendar/callback`,
    client_secret: clientSecret,
  });

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  const responseBody = await response.json();

  if (!response.ok) {
    return res.redirect(`/apps/installed?error=${JSON.stringify(responseBody)}`);
  }

  const whoami = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${responseBody.access_token}` },
  });
  const graphUser = await whoami.json();

  // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
  responseBody.email = graphUser.mail ?? graphUser.userPrincipalName;
  responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in); // set expiry date in seconds
  delete responseBody.expires_in;

  // Set the isDefaultCalendar as selectedCalendar
  // If a user has multiple calendars, keep on making calls until we find the default calendar
  let defaultCalendar: OfficeCalendar | undefined = undefined;
  let requestUrl = "https://graph.microsoft.com/v1.0/me/calendars?$select=id,isDefaultCalendar";
  let finishedParsingCalendars = false;

  while (!finishedParsingCalendars) {
    const calRequest = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${responseBody.access_token}`,
        "Content-Type": "application/json",
      },
    });

    logger.info("Office365 Calendar: Received calendar response", {
      userId: req.session?.user?.id,
      status: calRequest.status,
      statusText: calRequest.statusText,
      url: calRequest.url,
    });

    let calBody = await handleErrorsJson<{ value: OfficeCalendar[]; "@odata.nextLink"?: string }>(calRequest);

    logger.info("Office365 Calendar: handleErrorsJson completed", {
      userId: req.session?.user?.id,
      calendarCount: calBody.value?.length ?? 0,
    });

    if (typeof responseBody === "string") {
      calBody = JSON.parse(responseBody) as { value: OfficeCalendar[] };
    }

    const findDefaultCalendar = (calBody.value ?? []).find((calendar) => calendar.isDefaultCalendar);
    if (findDefaultCalendar) {
      defaultCalendar = findDefaultCalendar;
    }

    if (calBody["@odata.nextLink"]) {
      requestUrl = calBody["@odata.nextLink"];
    } else {
      finishedParsingCalendars = true;
    }
  }

  if (!defaultCalendar?.id) {
    const errorMessage = "no_default_calendar";
    res.redirect(
      `${getSafeRedirectUrl(state?.onErrorReturnTo) ?? getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })}?error=${errorMessage}`
    );
    return;
  }

  if (req.session?.user?.id) {
    const credential = await prisma.credential.create({
      data: {
        type: "office365_calendar",
        key: responseBody,
        userId: req.session?.user.id,
        appId: "office365-calendar",
      },
    });
    const selectedCalendarWhereUnique = {
      userId: req.session?.user.id,
      integration: "office365_calendar",
      externalId: defaultCalendar.id,
    };
    // Wrapping in a try/catch to reduce chance of race conditions-
    // also this improves performance for most of the happy-paths.
    try {
      await prisma.selectedCalendar.create({
        data: {
          ...selectedCalendarWhereUnique,
          credentialId: credential.id,
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
              getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })
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
          getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })
        }?error=${errorMessage}`
      );
      return;
    }
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: "calendar", slug: "office365-calendar" })
  );
  return;
}
