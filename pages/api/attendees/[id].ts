import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeeEditBodyParams, schemaAttendeeReadPublic } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /attendees/{id}:
 *   get:
 *     summary: Get an attendee by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the attendee to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Attendee was not found
 *   patch:
 *     summary: Edit an existing attendee
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: attendee
 *        description: The attendee to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Attendee'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the attendee to edit
 *     security:
 *       - ApiKeyAuth: []
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
 *   delete:
 *     summary: Remove an existing attendee
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the attendee to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee removed successfuly
 *         model: Attendee
 *       400:
 *        description: Bad request. Attendee id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function attendeeById(req: NextApiRequest, res: NextApiResponse<AttendeeResponse>) {
  const { method, query, body, userId } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ error: safeQuery.error });
    throw new Error("Invalid request query", safeQuery.error);
  }
  const userBookings = await prisma.booking.findMany({
    where: { userId },
    include: { attendees: true },
  });
  const attendees = userBookings.map((booking) => booking.attendees).flat();
  const attendeeIds = attendees.map((attendee) => attendee.id);
  // Here we make sure to only return attendee's of the user's own bookings.
  if (!attendeeIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.attendee
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaAttendeeReadPublic.parse(data))
          .then((attendee) => res.status(200).json({ attendee }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        const safeBody = schemaAttendeeEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          res.status(400).json({ message: "Bad request", error: safeBody.error });
          throw new Error("Invalid request body");
        }
        await prisma.attendee
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaAttendeeReadPublic.parse(data))
          .then((attendee) => res.status(200).json({ attendee }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.attendee
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Attendee with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(attendeeById));
