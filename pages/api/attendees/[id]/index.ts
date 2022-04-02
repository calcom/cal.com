import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeePublic } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/attendees/{id}:
 *   get:
 *   summary: Get a attendee by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the attendee to get
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Attendee was not found
 */
export async function attendeeById(req: NextApiRequest, res: NextApiResponse<AttendeeResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const attendee = await prisma.attendee.findUnique({ where: { id: safe.data.id } });
  const data = schemaAttendeePublic.parse(attendee);

  if (attendee) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Attendee was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(attendeeById));
