import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";

import { decodeOAuthState } from "./decodeOAuthState";

/**
 * This function is used to create app credentials for either a user or a team
 *
 * @param appData information about the app
 * @param appData.type the app slug
 * @param appData.appId the app slug
 * @param key the keys for the app's credentials
 * @param req the request object from the API call. Used to determine if the credential belongs to a user or a team
 */
const createAppCredential = async (
  appData: { type: string; appId: string },
  key: unknown,
  req: NextApiRequest
) => {
  const userId = req.session?.user.id;
  // For OAuth flows, see if a teamId was passed through the state
  const state = decodeOAuthState(req);
  if (state?.teamId) {
    // Check that the user belongs to the team
    const team = await prisma.team.findUnique({
      where: { id: state.teamId },
      select: { id: true, members: { select: { userId: true } } },
    });

    if (team?.members.some((member) => member.userId === userId)) {
      await prisma.credential.create({
        data: {
          type: appData.type,
          key: key || {},
          teamId: state.teamId,
          appId: appData.appId,
        },
      });
    } else {
      throw new Error("User does not belong to the team");
    }
  }

  await prisma.credential.create({
    data: {
      type: appData.type,
      key: key || {},
      userId,
      appId: appData.appId,
    },
  });

  return;
};

export default createAppCredential;
