import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeCustomInputsResponse } from "@lib/types";
import { schemaEventTypeCustomInputPublic } from "@lib/validations/event-type-custom-input";

/**
 * @swagger
 * /api/event-type-custom-inputs:
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
 */
async function allEventTypeCustomInputs(
  _: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputsResponse>
) {
  const eventTypeCustomInputs = await prisma.eventTypeCustomInput.findMany();
  const data = eventTypeCustomInputs.map((eventTypeCustomInput) =>
    schemaEventTypeCustomInputPublic.parse(eventTypeCustomInput)
  );

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No EventTypeCustomInputs were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allEventTypeCustomInputs);
