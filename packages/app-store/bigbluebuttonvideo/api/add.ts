import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

const getSafeReturnTo = (returnTo: NextApiRequest["query"][string]): string => {
  const fallback = getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" });
  if (typeof returnTo !== "string") {
    return fallback;
  }
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(returnTo)) {
    return fallback;
  }

  return returnTo;
};

const getTeamId = (teamId: NextApiRequest["query"][string]): number | null => {
  if (teamId === undefined) {
    return null;
  }

  let rawTeamId = teamId;
  if (Array.isArray(rawTeamId)) {
    rawTeamId = rawTeamId[0];
  }
  if (!/^\d+$/.test(rawTeamId)) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "Invalid teamId");
  }

  return Number(rawTeamId);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId, returnTo } = req.query;

  try {
    const parsedTeamId = getTeamId(teamId);

    await throwIfNotHaveAdminAccessToTeam({
      teamId: parsedTeamId,
      userId: req.session.user.id,
    });

    let installForObject: { teamId: number } | { userId: number };
    if (parsedTeamId !== null) {
      installForObject = { teamId: parsedTeamId };
    } else {
      installForObject = { userId: req.session.user.id };
    }
    const appType = "bigbluebutton_video";

    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
      select: {
        id: true,
      },
    });

    if (alreadyInstalled) {
      throw new ErrorWithCode(ErrorCode.BookingConflict, "Already installed");
    }

    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...installForObject,
        appId: "bigbluebutton",
      },
      select: {
        id: true,
      },
    });

    if (!installation) {
      throw new ErrorWithCode(
        ErrorCode.InternalServerError,
        "Unable to create user credential for bigbluebuttonvideo"
      );
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }

  return res.status(200).json({ url: getSafeReturnTo(returnTo) });
}
