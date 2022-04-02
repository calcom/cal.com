import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeeBodyParams, schemaAttendeePublic, withValidAttendee } from "@lib/validations/attendee";

/**
 * @swagger
 * /api/attendees/new:
 *   post:
 *     summary: Creates a new attendee
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/Attendee'
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
async function createAttendee(req: NextApiRequest, res: NextApiResponse<AttendeeResponse>) {
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
}

export default withMiddleware("HTTP_POST")(withValidAttendee(createAttendee));
