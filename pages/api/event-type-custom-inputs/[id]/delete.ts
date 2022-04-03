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
 * /api/event-type-custom-inputs/{id}/delete:
 *   delete:
 *     summary: Remove an existing eventTypeCustomInput
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the eventTypeCustomInput to delete
 *     tags:
 *     - event-type-custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput removed successfuly
 *         model: EventTypeCustomInput
 *       400:
 *        description: Bad request. EventTypeCustomInput id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteEventTypeCustomInput(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);

  const data = await prisma.eventTypeCustomInput.delete({ where: { id: safe.data.id } });

  if (data)
    res.status(200).json({ message: `EventTypeCustomInput with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `EventTypeCustomInput with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdTransformParseInt(deleteEventTypeCustomInput));
