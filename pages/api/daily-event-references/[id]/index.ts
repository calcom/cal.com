import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DailyEventReferenceResponse } from "@lib/types";
import { schemaDailyEventReferencePublic } from "@lib/validations/daily-event-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/daily-event-references/{id}:
 *   get:
 *     summary: Get a dailyEventReference by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the dailyEventReference to get
 *     tags:
 *     - daily-event-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: DailyEventReference was not found
 */
export async function dailyEventReferenceById(
  req: NextApiRequest,
  res: NextApiResponse<DailyEventReferenceResponse>
) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const dailyEventReference = await prisma.dailyEventReference.findUnique({ where: { id: safe.data.id } });
  const data = schemaDailyEventReferencePublic.parse(dailyEventReference);

  if (dailyEventReference) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "DailyEventReference was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(dailyEventReferenceById));
