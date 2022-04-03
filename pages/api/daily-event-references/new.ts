import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DailyEventReferenceResponse } from "@lib/types";
import {
  schemaDailyEventReferenceBodyParams,
  schemaDailyEventReferencePublic,
  withValidDailyEventReference,
} from "@lib/validations/daily-event-reference";

/**
 * @swagger
 * /api/daily-event-references/new:
 *   post:
 *     summary: Creates a new dailyEventReference
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           $ref: '#/components/schemas/DailyEventReference'
 *     tags:
 *     - daily-event-references
 *     responses:
 *       201:
 *         description: OK, dailyEventReference created
 *         model: DailyEventReference
 *       400:
 *        description: Bad request. DailyEventReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createDailyEventReference(
  req: NextApiRequest,
  res: NextApiResponse<DailyEventReferenceResponse>
) {
  const safe = schemaDailyEventReferenceBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const dailyEventReference = await prisma.dailyEventReference.create({ data: safe.data });
  const data = schemaDailyEventReferencePublic.parse(dailyEventReference);

  if (data) res.status(201).json({ data, message: "DailyEventReference created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new dailyEventReference",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidDailyEventReference(createDailyEventReference));
