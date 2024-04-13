import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import type { schemaEventTypeCreateBodyParams } from "~/lib/validations/event-type";

export default async function checkTeamEventEditPermission(
  req: NextApiRequest,
  body: Pick<z.infer<typeof schemaEventTypeCreateBodyParams>, "teamId" | "userId">
) {
  const { isAdmin } = req;
  let userId = req.userId;
  if (isAdmin && body.userId) {
    userId = body.userId;
  }
  if (body.teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId: body.teamId,
        accepted: true,
      },
    });

    if (!membership?.role || !["ADMIN", "OWNER"].includes(membership.role)) {
      throw new HttpError({
        statusCode: 403,
        message: "No permission to operate on event-type for this team",
      });
    }
  }
}
