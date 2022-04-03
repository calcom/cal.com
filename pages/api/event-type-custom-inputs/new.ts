import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeCustomInputResponse } from "@lib/types";
import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
  withValidEventTypeCustomInput,
} from "@lib/validations/event-type-custom-input";

/**
 * @swagger
 * /api/event-type-custom-inputs/new:
 *   post:
 *     summary: Creates a new eventTypeCustomInput
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           $ref: '#/components/schemas/EventTypeCustomInput'
 *     tags:
 *     - event-type-custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput created
 *         model: EventTypeCustomInput
 *       400:
 *        description: Bad request. EventTypeCustomInput body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createEventTypeCustomInput(
  req: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputResponse>
) {
  const safe = schemaEventTypeCustomInputBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const eventTypeCustomInput = await prisma.eventTypeCustomInput.create({ data: safe.data });
  const data = schemaEventTypeCustomInputPublic.parse(eventTypeCustomInput);

  if (data) res.status(201).json({ data, message: "EventTypeCustomInput created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new eventTypeCustomInput",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidEventTypeCustomInput(createEventTypeCustomInput));
