import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { DailyEventReferencesResponse } from "@lib/types";
import { schemaDailyEventReferencePublic } from "@lib/validations/daily-event-reference";

/**
 * @swagger
 * /api/daily-event-references:
 *   get:
 *     summary: Get all dailyEventReferences
 *     tags:
 *     - daily-event-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No dailyEventReferences were found
 */
async function allDailyEventReferences(
  _: NextApiRequest,
  res: NextApiResponse<DailyEventReferencesResponse>
) {
  const dailyEventReferences = await prisma.dailyEventReference.findMany();
  const data = dailyEventReferences.map((dailyEventReference) =>
    schemaDailyEventReferencePublic.parse(dailyEventReference)
  );

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No DailyEventReferences were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allDailyEventReferences);
