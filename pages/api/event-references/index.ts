import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { DailyEventReferenceResponse, DailyEventReferencesResponse } from "@lib/types";
import {
  schemaDailyEventReferenceCreateBodyParams,
  schemaDailyEventReferenceReadPublic,
} from "@lib/validations/daily-event-reference";

async function createOrlistAllDailyEventReferences(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<DailyEventReferencesResponse | DailyEventReferenceResponse>
) {
  const userBookings = await prisma.booking.findMany({ where: { userId } });
  const userBookingIds = userBookings.map((booking) => booking.id);

  if (method === "GET") {
    /**
     * @swagger
     * /event-references:
     *   get:
     *     summary: Find all daily event reference
     *     tags:
     *     - event-references
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No daily event references were found
     */
    const data = await prisma.dailyEventReference.findMany({
      where: { bookingId: { in: userBookingIds } },
    });
    const daily_event_references = data.map((dailyEventReference) =>
      schemaDailyEventReferenceReadPublic.parse(dailyEventReference)
    );
    if (daily_event_references) res.status(200).json({ daily_event_references });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No DailyEventReferences were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /event-references:
     *   post:
     *     summary: Creates a new daily event reference
     *     tags:
     *     - event-references
     *     responses:
     *       201:
     *         description: OK, daily event reference created
     *       400:
     *        description: Bad request. DailyEventReference body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaDailyEventReferenceCreateBodyParams.safeParse(body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.dailyEventReference.create({ data: safe.data });
    const daily_event_reference = schemaDailyEventReferenceReadPublic.parse(data);

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
