import type { Session } from "next-auth";
import { OAuth2Configuration } from "pipedrive";
import { z } from "zod";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";

import appConfig from "../config.json";

const OAuth2TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  api_domain: z.string(),
});

export const pipedriveAppKeysSchema = z.object({
  client_id: z.string(),
  secret_key: z.string(),
  tokens: OAuth2TokenResponse.optional(),
  last_refresh: z.number().optional(),
});

export const getOAuthClientFromSession = async (
  session: Session
): Promise<{ client: OAuth2Configuration; tenantId: number }> => {
  const user = session?.user;

  if (user === undefined) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  const { type, slug } = appConfig;
  const credential = await prisma.credential.findFirst({
    where: {
      type,
      userId: user.id,
      appId: slug,
    },
  });

  if (!credential) {
    throw new HttpError({
      statusCode: 400,
      message: "Credentials not created - Application is not installed.",
    });
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: Number(credential.teamId) ?? null, userId: user.id });

  const tenantId = credential.teamId ? credential.teamId : user.id;
  const client = getOAuthClientFromCredential(credential);

  return { client, tenantId };
};

export const getOAuthClientFromCredential = (credential: Pick<CredentialPayload, "key">) => {
  const keys = credential.key as z.infer<typeof pipedriveAppKeysSchema>;

  const oAuthConfig = new OAuth2Configuration({
    clientId: keys.client_id,
    clientSecret: keys.secret_key,
    redirectUri: `${WEBAPP_URL}/api/integrations/pipedrive-crm/callback`,
  });
  return oAuthConfig;
};
