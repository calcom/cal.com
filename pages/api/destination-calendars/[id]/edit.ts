import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DestinationCalendarResponse } from "@lib/types";
import {
  schemaDestinationCalendarBodyParams,
  schemaDestinationCalendarPublic,
  withValidDestinationCalendar,
} from "@lib/validations/destination-calendar";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/destination-calendars/{id}/edit:
 *   patch:
 *     summary: Edit an existing destinationCalendar
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the destinationCalendar to edit
 *     tags:
 *     - destination-calendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar edited successfuly
 *         model: DestinationCalendar
 *       400:
 *        description: Bad request. DestinationCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editDestinationCalendar(
  req: NextApiRequest,
  res: NextApiResponse<DestinationCalendarResponse>
) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaDestinationCalendarBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaDestinationCalendarPublic.parse(destinationCalendar);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidDestinationCalendar(editDestinationCalendar))
);
