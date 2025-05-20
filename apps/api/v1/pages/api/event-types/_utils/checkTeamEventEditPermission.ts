import type { NextApiRequest, NextApiResponse } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import type { PrismaClient } from "@calcom/prisma";
import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";

import type { schemaEventTypeCreateBodyParams } from "~/lib/validations/event-type";

export default withPrismaApiHandler(async function checkTeamEventEditPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  prisma: PrismaClient
) {
  const body = req.body as Pick<z.infer<typeof schemaEventTypeCreateBodyParams>, "teamId" | "userId">;
  if (body.teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.userId,
        teamId: body.teamId,
        accepted: true,
        role: { in: ["ADMIN", "OWNER"] },
      },
    });

    if (!membership) {
      throw new HttpError({
        statusCode: 403,
        message: "No permission to operate on event-type for this team",
      });
    }
  }
});
