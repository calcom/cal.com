import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import type { z } from "zod";
import type { schemaEventTypeCreateBodyParams } from "~/lib/validations/event-type";

export default async function ensureOnlyMembersAsHosts(
  req: NextApiRequest,
  body: Pick<z.infer<typeof schemaEventTypeCreateBodyParams>, "hosts" | "teamId">
) {
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
}
