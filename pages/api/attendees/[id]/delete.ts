import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BaseResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/attendees/{id}/delete:
 *   delete:
 *     summary: Remove an existing attendee
 *    parameters:
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
export async function deleteAttendee(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);

  const data = await prisma.attendee.delete({ where: { id: safe.data.id } });

  if (data) res.status(200).json({ message: `Attendee with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `Attendee with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdTransformParseInt(deleteAttendee));
