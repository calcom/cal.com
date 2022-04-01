import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AttendeesResponse } from "@lib/types";
import { schemaAttendeePublic } from "@lib/validations/attendee";

/**
 * @swagger
 * /api/attendees:
 *   get:
 *     summary: Get all attendees
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No attendees were found
 */
async function allAttendees(_: NextApiRequest, res: NextApiResponse<AttendeesResponse>) {
  const attendees = await prisma.attendee.findMany();
  const data = attendees.map((attendee) => schemaAttendeePublic.parse(attendee));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Attendees were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allAttendees);
