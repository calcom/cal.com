import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { getGoogleSheetsAppKeys } from "../lib/getGoogleSheetsAppKeys";

const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

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

  const { client_id, client_secret } = await getGoogleSheetsAppKeys();
  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlesheets/callback`;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

  if (code) {
    const token = await oAuth2Client.getToken(code);
    const key = token.tokens;
    const grantedScopes = token.tokens.scope?.split(" ") ?? [];
    
    // Check if we have granted all required permissions
    const hasMissingRequiredScopes = GOOGLE_SHEETS_SCOPES.some((scope) => !grantedScopes.includes(scope));
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

    // Store the credential
    await CredentialRepository.create({
      userId: req.session.user.id,
      key,
      appId: "googlesheets",
      type: "googlesheets_other",
    });
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: "other", slug: "googlesheets" })
  );
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});