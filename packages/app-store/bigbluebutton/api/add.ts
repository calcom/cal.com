import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getTeamId = (value: string | string[] | undefined) => {
  const rawTeamId = getSingleQueryValue(value);
  if (!rawTeamId) {
    return null;
  }

  if (!/^\d+$/.test(rawTeamId)) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "Invalid teamId");
  }

  return Number(rawTeamId);
};

const getSafeReturnTo = (value: string | string[] | undefined) => {
  const returnTo = getSingleQueryValue(value);
  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(returnTo)
  ) {
    return getInstalledAppPath({
      variant: "conferencing",
      slug: "bigbluebutton",
    });
  }

  return returnTo;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!req.session?.user?.id) {
    return res
      .status(401)
      .json({ message: "You must be logged in to do this" });
  }

  const { teamId, returnTo } = req.query;

  try {
    const teamIdNumber = getTeamId(teamId);

    await throwIfNotHaveAdminAccessToTeam({
      teamId: teamIdNumber,
      userId: req.session.user.id,
    });

    const installForObject = teamIdNumber
      ? { teamId: teamIdNumber }
      : { userId: req.session.user.id };
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
        "Unable to create user credential for bigbluebutton",
      );
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res
      .status(httpError.statusCode)
      .json({ message: httpError.message });
  }

  return res.status(200).json({
    url: getSafeReturnTo(returnTo),
  });
}
