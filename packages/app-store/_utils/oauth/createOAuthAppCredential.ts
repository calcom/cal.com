import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../oauth/decodeOAuthState";
import { throwIfNotHaveAdminAccessToTeam } from "../throwIfNotHaveAdminAccessToTeam";

/**
 * This function is used to create app credentials for either a user or a team
 *
 * @param appData information about the app
 * @param appData.type the app slug
 * @param appData.appId the app slug
 * @param key the keys for the app's credentials
 * @param req the request object from the API call. Used to determine if the credential belongs to a user or a team
 */
const createOAuthAppCredential = async (
  appData: { type: string; appId: string },
  key: unknown,
  req: NextApiRequest
) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  // For OAuth flows, see if a teamId was passed through the state
  const state = decodeOAuthState(req);
  if (state?.teamId) {
    // Check that the user belongs to the team
    await throwIfNotHaveAdminAccessToTeam({ teamId: state?.teamId ?? null, userId });
  }

  const baseData = {
    type: appData.type,
    key: key || {},
    appId: appData.appId,
    ...(state?.teamId ? { teamId: state.teamId } : { userId }),
  };

  const credentialId = (state?.credentialId || -1) as number;

  await prisma.credential.upsert({
    where: { id: credentialId }, // Use a dummy ID if not upgrading
    create: baseData,
    update: baseData,
  });
};

export default createOAuthAppCredential;
