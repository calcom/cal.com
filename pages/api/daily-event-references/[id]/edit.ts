import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DailyEventReferenceResponse } from "@lib/types";
import {
  schemaDailyEventReferenceBodyParams,
  schemaDailyEventReferencePublic,
  withValidDailyEventReference,
} from "@lib/validations/daily-event-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/daily-event-references/{id}/edit:
 *   patch:
 *     summary: Edit an existing dailyEventReference
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the dailyEventReference to edit
 *     tags:
 *     - dailyEventReferences
 *     responses:
 *       201:
 *         description: OK, dailyEventReference edited successfuly
 *         model: DailyEventReference
 *       400:
 *        description: Bad request. DailyEventReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editDailyEventReference(
  req: NextApiRequest,
  res: NextApiResponse<DailyEventReferenceResponse>
) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaDailyEventReferenceBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const dailyEventReference = await prisma.dailyEventReference.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaDailyEventReferencePublic.parse(dailyEventReference);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidDailyEventReference(editDailyEventReference))
);
