import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AttendeeResponse, AttendeesResponse } from "@lib/types";
import { schemaAttendeeBodyParams, schemaAttendeePublic, withValidAttendee } from "@lib/validations/attendee";

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
 *   post:
 *     summary: Creates a new attendee
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee created
 *         model: Attendee
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllAttendees(
  req: NextApiRequest,
  res: NextApiResponse<AttendeesResponse | AttendeeResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const attendees = await prisma.attendee.findMany();
    const data = attendees.map((attendee) => schemaAttendeePublic.parse(attendee));
    if (data) res.status(200).json({ data });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Attendees were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaAttendeeBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body", safe.error);

    const attendee = await prisma.attendee.create({ data: safe.data });
    const data = schemaAttendeePublic.parse(attendee);

    if (data) res.status(201).json({ data, message: "Attendee created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new attendee",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(withValidAttendee(createOrlistAllAttendees));
