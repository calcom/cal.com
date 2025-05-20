import type { NextApiRequest, NextApiResponse } from "next";
import type { z } from "zod";

import type { PrismaClient } from "@calcom/prisma";
import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";

import type { schemaEventTypeCreateBodyParams } from "~/lib/validations/event-type";

export default withPrismaApiHandler(async function ensureOnlyMembersAsHosts(
  req: NextApiRequest,
  res: NextApiResponse,
  prisma: PrismaClient
) {
  const body = req.body as Pick<z.infer<typeof schemaEventTypeCreateBodyParams>, "hosts" | "teamId">;
  if (body.teamId && body.hosts && body.hosts.length > 0) {
    const teamMemberCount = await prisma.membership.count({
      where: {
        teamId: body.teamId,
        userId: { in: body.hosts.map((host) => host.userId) },
      },
    });
    if (teamMemberCount !== body.hosts.length) {
      throw new Error("You can only add members of the team to a team event type.");
    }
  }
});
