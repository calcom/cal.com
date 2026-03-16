import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../oauth/decodeOAuthState";
import { throwIfNotHaveAdminAccessToCalIdTeam } from "../throwIfNotHaveAdminAccessToCalIdTeam";

/**
 * This function is used to create app credentials for either a user or a team
 *
 * @param appData information about the app
 * @param appData.type the app slug
 * @param appData.appId the app slug
 * @param key the keys for the app's credentials
 * @param req the request object from the API call. Used to determine if the credential belongs to a user or a team
 */

export const createOAuthAppCredentialDirect = async (
  appData: { type: string; appId: string },
  key: unknown,
  userId: number,
  calIdTeamId: number | null
) => {
  // see if a teamId or calIdTeamId was passed.
  if (calIdTeamId) {
    // Check that the user belongs to the calIdTeam
    await throwIfNotHaveAdminAccessToCalIdTeam({ teamId: state?.calIdTeamId ?? null, userId });

    return await prisma.credential.create({
      data: {
        type: appData.type,
        key: key || {},
        calIdTeamId: state.calIdTeamId,
        appId: appData.appId,
      },
    });
  }

  return await prisma.credential.create({
    data: {
      type: appData.type,
      key: key || {},
      userId,
      appId: appData.appId,
    },
  });
};

export default createOAuthAppCredentialDirect;