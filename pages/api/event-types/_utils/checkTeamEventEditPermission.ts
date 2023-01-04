import type { NextApiRequest } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";

import { schemaEventTypeBaseBodyParams } from "~/lib/validations/event-type";

export default async function checkTeamEventEditPermission(
  req: NextApiRequest,
  body: Pick<z.infer<typeof schemaEventTypeBaseBodyParams>, "teamId">
) {
  const { prisma, userId } = req;
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
        statusCode: 401,
        message: "No permission to operate on event-type for this team",
      });
    }
  }
}
