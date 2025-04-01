import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const prisma = (await import("@calcom/prisma")).default;
  const session = await getServerSession({ req });

  return res.status(200).json(session);

  // if (!session)
  //   return res.status(401).json({
  //     status: "error",
  //     timestamp: new Date().toISOString(),
  //     path: "/v2/me",
  //     error: {
  //       code: "UnauthorizedException",
  //       message: "Invalid Access Token.",
  //       details: {
  //         message: "Invalid Access Token.",
  //         error: "Unauthorized",
  //         statusCode: 401,
  //       },
  //     },
  //   });

  const user = await prisma.user.findUnique({ where: { id: 60 } });

  if (!user)
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toISOString(),
      path: "/v2/me",
      error: {
        code: "NotFoundException",
        message: "User not found.",
        details: {
          message: "User not found.",
          error: "Not Found",
          statusCode: 404,
        },
      },
    });

  const organization =
    user.organizationId && (await prisma.team.findUnique({ where: { id: user.organizationId } }));

  return res.status(200).json({
    status: "success",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      timeFormat: user.timeFormat,
      defaultScheduleId: user.defaultScheduleId,
      weekStart: user.weekStart,
      timeZone: user.timeZone,
      organizationId: organization && organization.id,
      organization: organization && {
        isPlatform: organization.isPlatform,
        id: organization.id,
      },
    },
  });
}
