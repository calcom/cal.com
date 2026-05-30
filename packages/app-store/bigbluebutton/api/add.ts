import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId, returnTo } = req.query;
  const parsedTeamId =
    typeof teamId === "string" && Number.isInteger(Number(teamId)) && Number(teamId) > 0
      ? Number(teamId)
      : null;

  if (teamId && parsedTeamId === null) {
    return res.status(400).json({ message: "Invalid teamId" });
  }

  await throwIfNotHaveAdminAccessToTeam({
    teamId: parsedTeamId,
    userId: req.session.user.id,
  });

  const installForObject = parsedTeamId ? { teamId: parsedTeamId } : { userId: req.session.user.id };
  const appType = "bigbluebutton_video";

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });

    if (alreadyInstalled) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "Already installed");
    }

    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    if (!installation) {
      throw new ErrorWithCode(
        ErrorCode.InternalServerError,
        "Unable to create user credential for BigBlueButton"
      );
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }

  return res.status(200).json({
    url: returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" }),
  });
}
