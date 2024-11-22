import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation, isAppInstalled } from "@calcom/app-store/_utils/installation";
import { GOOGLE_CALENDAR_SCOPES, SCOPE_USERINFO_PROFILE, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import type { App } from "@calcom/types/App";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { metadata } from "../_metadata";
import { SCOPES } from "../lib/constants";

import { getGoogleAppKeys } from "../lib/getGoogleAppKeys";

async function getDomainWideDelegationForApp({
  user,
  appMetadata,
}: {
  user: {
    email: string;
  };
  appMetadata: Pick<App, "domainWideDelegation">;
}) {
  const log = logger.getSubLogger({ prefix: ["getDomainWideDelegationForApp"] });

  const domainWideDelegation = await DomainWideDelegationRepository.findUniqueByOrganizationMemberEmail({
    email: user.email,
  });

  if (!domainWideDelegation || !domainWideDelegation.enabled || !appMetadata.domainWideDelegation) {
    log.debug("Domain-wide delegation isn't enabled for this app", {
      domainWideDelegationEnabled: domainWideDelegation?.enabled,
      metadataDomainWideDelegation: appMetadata.domainWideDelegation,
    });
    return null;
  }

  if (
    domainWideDelegation.workspacePlatform.slug !== appMetadata.domainWideDelegation.workspacePlatformSlug
  ) {
    log.info("Domain-wide delegation isn't compatible with this app", {
      domainWideDelegation: domainWideDelegation.workspacePlatform.slug,
      appSlug: metadata.slug,
    });
    return null;
  }

  log.debug("Domain-wide delegation is enabled");

  return domainWideDelegation;
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const loggedInUser = req.session?.user;

  if (!loggedInUser) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const translate = await getTranslation(loggedInUser.locale ?? "en", "common");

  // Ideally this should never happen, as email is there in session user but typings aren't accurate it seems
  // TODO: So, confirm and later fix the typings
  if (!loggedInUser.email) {
    throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
  }

  // const domainWideDelegation = await getDomainWideDelegationForApp({
  //   user: {
  //     email: loggedInUser.email,
  //   },
  //   appMetadata: metadata,
  // });

  // if (domainWideDelegation) {
  //   if (await isAppInstalled({ appId: metadata.slug, userId: loggedInUser.id })) {
  //     throw new HttpError({
  //       statusCode: 422,
  //       message: translate("domain_wide_delegation_restricts_adding_more_than_one_installation"),
  //     });
  //   }

  //   await createDefaultInstallation({
  //     appType: metadata.type,
  //     user: loggedInUser,
  //     slug: metadata.slug,
  //     delegatedToId: domainWideDelegation.id,
  //     key: {
  //       // FIXME: zod validation somewhere requires access_token, when infact it isn't needed for domain-wide delegation
  //       access_token: "NOT_A_TOKEN",
  //     },
  //   });
  //   res
  //     .status(200)
  //     .json({ message: translate("app_successfully_installed_and_is_using_delegated_credentials") });
  //   return;
  // }

  const { client_id, client_secret } = await getGoogleAppKeys();
  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [SCOPE_USERINFO_PROFILE, ...GOOGLE_CALENDAR_SCOPES],
    // A refresh token is only returned the first time the user
    // consents to providing access.  For illustration purposes,
    // setting the prompt to 'consent' will force this consent
    // every time, forcing a refresh_token to be returned.
    prompt: "consent",
    state: encodeOAuthState(req),
  });

  res.status(200).json({ url: authUrl });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
