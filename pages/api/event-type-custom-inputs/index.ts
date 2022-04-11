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
 * /v1/event-type-custom-inputs:
 *   get:
 *     summary: Get all eventTypeCustomInputs
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
  if (method === "GET") {
    const data = await prisma.eventTypeCustomInput.findMany();
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

    const data = await prisma.eventTypeCustomInput.create({ data: safe.data });
    const event_type_custom_input = schemaEventTypeCustomInputPublic.parse(data);

    if (event_type_custom_input)
      res.status(201).json({ event_type_custom_input, message: "EventTypeCustomInput created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new eventTypeCustomInput",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllEventTypeCustomInputs);
