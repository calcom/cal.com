import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeeBodyParams, schemaAttendeePublic, withValidAttendee } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/attendees/{id}/edit:
 *   patch:
 *     summary: Edit an existing attendee
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the attendee to edit
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee edited successfuly
 *         model: Attendee
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editAttendee(req: NextApiRequest, res: NextApiResponse<AttendeeResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaAttendeeBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const attendee = await prisma.attendee.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaAttendeePublic.parse(attendee);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidAttendee(editAttendee))
);
