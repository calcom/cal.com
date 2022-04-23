import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { DailyEventReferenceResponse, DailyEventReferencesResponse } from "@lib/types";
import {
  schemaDailyEventReferenceBodyParams,
  schemaDailyEventReferencePublic,
} from "@lib/validations/daily-event-reference";

/**
 * @swagger
 * /v1/daily-event-references:
 *   get:
 *     summary: Get all daily event reference
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - daily-event-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No daily event references were found
 *   post:
 *     summary: Creates a new daily event reference
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - daily-event-references
 *     responses:
 *       201:
 *         description: OK, daily event reference created
 *         model: DailyEventReference
 *       400:
 *        description: Bad request. DailyEventReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllDailyEventReferences(
  req: NextApiRequest,
  res: NextApiResponse<DailyEventReferencesResponse | DailyEventReferenceResponse>
) {
  const { method } = req;
  const userId = req.userId;
  const userBookings = await prisma.booking.findMany({ where: { userId } });
  const userBookingIds = userBookings.map((booking) => booking.id);

  if (method === "GET") {
    const data = await prisma.dailyEventReference.findMany({
      where: { bookingId: { in: userBookingIds } },
    });
    const daily_event_references = data.map((dailyEventReference) =>
      schemaDailyEventReferencePublic.parse(dailyEventReference)
    );
    if (daily_event_references) res.status(200).json({ daily_event_references });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No DailyEventReferences were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaDailyEventReferenceBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.dailyEventReference.create({ data: safe.data });
    const daily_event_reference = schemaDailyEventReferencePublic.parse(data);

    if (daily_event_reference)
      res.status(201).json({ daily_event_reference, message: "DailyEventReference created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new daily event reference",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllDailyEventReferences);
