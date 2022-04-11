import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeeBodyParams, schemaAttendeePublic } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/attendees/{id}:
 *   get:
 *     summary: Get an attendee by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the attendee to get
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
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaAttendeeBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);

  switch (method) {
    case "GET":
      await prisma.attendee
        .findUnique({ where: { id: safeQuery.data.id } })
        .then((data) => schemaAttendeePublic.parse(data))
        .then((attendee) => res.status(200).json({ attendee }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Attendee with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "PATCH":
      if (!safeBody.success) throw new Error("Invalid request body");
      await prisma.attendee
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((data) => schemaAttendeePublic.parse(data))
        .then((attendee) => res.status(200).json({ attendee }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Attendee with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "DELETE":
      await prisma.attendee
        .delete({ where: { id: safeQuery.data.id } })
        .then(() =>
          res.status(200).json({ message: `Attendee with id: ${safeQuery.data.id} deleted successfully` })
        )
        .catch((error: Error) =>
          res.status(404).json({ message: `Attendee with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(attendeeById));
