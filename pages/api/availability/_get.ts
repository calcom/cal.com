import { HttpError } from "@/../../packages/lib/http-error";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { defaultResponder } from "@calcom/lib/server";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

const availabilitySchema = z
  .object({
    userId: stringOrNumber.optional(),
    teamId: stringOrNumber.optional(),
    username: z.string().optional(),
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })
  .refine(
    (data) => !!data.username || !!data.userId || !!data.teamId,
    "Either username or userId or teamId should be filled in."
  );

async function handler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  const { username, userId, eventTypeId, dateTo, dateFrom, teamId } = availabilitySchema.parse(req.query);
  if (!teamId)
    return getUserAvailability({
      username,
      dateFrom,
      dateTo,
      eventTypeId,
      userId,
    });
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { members: { select: availabilityUserSelect  } } });
  if (!team) throw new HttpError({ statusCode: 404, message: "teamId not found" });
  if (!team.members) throw new HttpError({ statusCode: 404, message: "teamId not found" });
  if (!isAdmin) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  return team.members.map(
    async (user) =>
      await getUserAvailability({
        username,
        dateFrom,
        dateTo,
        eventTypeId,
        userId: user.userId,
      }, {initialData: { user }})
  );
}

export default defaultResponder(handler);
