import type { AxiosError } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import setDefaultConferencingApp from "../../_utils/setDefaultConferencingApp";
import config from "../config.json";
import { getKyzonCredentialKey, type KyzonCredentialKey } from "../lib/KyzonCredentialKey";
import { kyzonAxiosInstance } from "../lib/axios";
import { getKyzonAppKeys } from "../lib/getKyzonAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = decodeOAuthState(req);
  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }
  const { code, error, error_description } = req.query;

  if (error) {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: config.variant, slug: config.slug })
      );
      return;
    }
    res.status(400).json({ message: error_description ?? error });
    return;
  }

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: config.variant, slug: config.slug })
      );
      return;
    }
    res.status(400).json({ message: "No code returned" });
    return;
  }

  const { client_id, client_secret, api_key } = await getKyzonAppKeys();

  let credentialKey: KyzonCredentialKey;

  try {
    const { data: authorizeResult } = await kyzonAxiosInstance.post<{
      access_token: string;
      refresh_token: string;
      token_type: "Bearer";
      expires_in: number;
      scope: string;
      error?: string;
      error_description?: string;
      error_uri?: string;
    }>(
      "/oauth/token",
      {
        grant_type: "authorization_code",
        code,
        client_id,
        client_secret,
        redirect_uri: `${WEBAPP_URL}/api/integrations/${config.slug}/callback`,
      },
      {
        headers: {
          "X-API-Key": api_key,
        },
      }
    );

    if (authorizeResult.error_description) {
      res.status(400).json({ message: authorizeResult.error_description });
      return;
    }

    if (authorizeResult.error) {
      res.status(400).json({ message: authorizeResult.error });
      return;
    }

    const { data: profile } = await kyzonAxiosInstance.get<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      teamId: string;
    }>("/v1/oauth/me", {
      headers: {
        Authorization: `Bearer ${authorizeResult.access_token}`,
      },
    });

    credentialKey = getKyzonCredentialKey({
      ...authorizeResult,
      user_id: profile.id,
      team_id: profile.teamId,
    });
  } catch (error) {
    let errorMessage = "Something went wrong connecting to KYZON Space.";

    try {
      const _errorMessage = (
        error as AxiosError<{
          error: string;
          error_description: string;
          error_uri?: string;
        }>
      ).response?.data.error_description;

      if (_errorMessage) {
        errorMessage = _errorMessage;
      } else {
        console.error(error);
      }
    } catch (e) {
      console.error(error);
    }

    res.status(400).json({ message: errorMessage });
    return;
  }

  // With this we take care of no duplicate kyzon-space key for a single user
  // when creating a room using deleteMany if there is already a kyzon-space key
  await prisma.credential.deleteMany({
    where: {
      type: config.type,
      userId,
      appId: config.slug,
    },
  });

  await createOAuthAppCredential({ appId: config.slug, type: config.type }, credentialKey, req);

  if (state?.defaultInstall) {
    setDefaultConferencingApp(userId, config.slug);
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: config.variant, slug: config.slug })
  );
}
