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
 * /api/booking-references/{id}/delete:
 *   delete:
 *     summary: Remove an existing bookingReference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the bookingReference to delete
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference removed successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteBookingReference(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);

  const data = await prisma.bookingReference.delete({ where: { id: safe.data.id } });

  if (data)
    res.status(200).json({ message: `BookingReference with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `BookingReference with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdTransformParseInt(deleteBookingReference));
