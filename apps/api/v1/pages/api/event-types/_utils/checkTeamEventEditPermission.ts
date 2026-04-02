import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import type { z } from "zod";
import type { schemaEventTypeCreateBodyParams } from "~/lib/validations/event-type";

export default async function checkTeamEventEditPermission(
  req: NextApiRequest,
  body: Pick<z.infer<typeof schemaEventTypeCreateBodyParams>, "teamId" | "userId">
) {
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
}
