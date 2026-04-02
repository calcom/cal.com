import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isSystemWideAdmin) return;
  const userEventTypes = await prisma.eventType.findMany({
    where: { userId },
    select: { id: true },
  });

  const userEventTypeIds = userEventTypes.map((eventType) => eventType.id);

  const destinationCalendar = await prisma.destinationCalendar.findFirst({
    where: {
      AND: [
        { id },
        {
          OR: [{ userId }, { eventTypeId: { in: userEventTypeIds } }],
        },
      ],
    },
  });
  if (!destinationCalendar)
    throw new HttpError({ statusCode: 404, message: "Destination calendar not found" });
}

export default authMiddleware;
