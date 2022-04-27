import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeCustomInputResponse, EventTypeCustomInputsResponse } from "@lib/types";
import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
} from "@lib/validations/event-type-custom-input";

/**
 * @swagger
 * /event-type-custom-inputs:
 *   get:
 *     summary: Find all eventTypeCustomInputs
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-type-custom-inputs
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No eventTypeCustomInputs were found
 *   post:
 *     summary: Creates a new eventTypeCustomInput
 *     security:
 *       - ApiKeyAuth: []
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
async function createOrlistAllEventTypeCustomInputs(
  req: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputsResponse | EventTypeCustomInputResponse>
) {
  const { method } = req;
  const userId = req.userId;
  const data = await prisma.eventType.findMany({ where: { userId } });
  const userEventTypes = data.map((eventType) => eventType.id);

  if (method === "GET") {
    const data = await prisma.eventTypeCustomInput.findMany({ where: { eventType: userEventTypes } });
    const event_type_custom_inputs = data.map((eventTypeCustomInput) =>
      schemaEventTypeCustomInputPublic.parse(eventTypeCustomInput)
    );
    if (event_type_custom_inputs) res.status(200).json({ event_type_custom_inputs });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No EventTypeCustomInputs were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaEventTypeCustomInputBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");
    // Since we're supporting a create or connect relation on eventType, we need to treat them differently
    // When using connect on event type, check if userId is the owner of the event
    if (safe.data.eventType.connect && !userEventTypes.includes(safe.data.eventType.connect.id as number)) {
      const data = await prisma.eventTypeCustomInput.create({ data: { ...safe.data } });
      const event_type_custom_input = schemaEventTypeCustomInputPublic.parse(data);
      if (event_type_custom_input)
        res
          .status(201)
          .json({ event_type_custom_input, message: "EventTypeCustomInput created successfully" });
      // When creating, no need
      // FIXME: we might want to pass userId to the new created/linked eventType, though.
    } else if (safe.data.eventType.create) {
      const data = await prisma.eventTypeCustomInput.create({ data: { ...safe.data } });
      const event_type_custom_input = schemaEventTypeCustomInputPublic.parse(data);
      if (event_type_custom_input)
        res
          .status(201)
          .json({ event_type_custom_input, message: "EventTypeCustomInput created successfully" });
    } else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new eventTypeCustomInput",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllEventTypeCustomInputs);
