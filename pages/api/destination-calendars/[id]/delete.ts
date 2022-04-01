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
 * /api/destination-calendars/{id}/delete:
 *   delete:
 *     summary: Remove an existing destinationCalendar
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the destinationCalendar to delete
 *     tags:
 *     - destinationCalendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar removed successfuly
 *         model: DestinationCalendar
 *       400:
 *        description: Bad request. DestinationCalendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteDestinationCalendar(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);

  const data = await prisma.destinationCalendar.delete({ where: { id: safe.data.id } });

  if (data)
    res.status(200).json({ message: `DestinationCalendar with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `DestinationCalendar with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdTransformParseInt(deleteDestinationCalendar));
