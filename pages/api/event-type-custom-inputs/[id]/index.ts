import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeCustomInputResponse } from "@lib/types";
import { schemaEventTypeCustomInputPublic } from "@lib/validations/event-type-custom-input";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/event-type-custom-inputs/{id}:
 *   get:
 *     summary: Get a eventTypeCustomInput by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the eventTypeCustomInput to get
 *     tags:
 *     - event-type-custom-inputs
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: EventTypeCustomInput was not found
 */
export async function eventTypeCustomInputById(
  req: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputResponse>
) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const eventTypeCustomInput = await prisma.eventTypeCustomInput.findUnique({ where: { id: safe.data.id } });
  const data = schemaEventTypeCustomInputPublic.parse(eventTypeCustomInput);

  if (eventTypeCustomInput) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "EventTypeCustomInput was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(eventTypeCustomInputById));
