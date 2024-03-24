import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemaEventTypeCustomInputPublic } from "~/lib/validations/event-type-custom-input";

/**
 * @swagger
 * /custom-inputs:
 *   get:
 *     summary: Find all eventTypeCustomInputs
 *     parameters:
 *        - in: query
 *          name: apiKey
 *          required: true
 *          schema:
 *            type: string
 *          description: Your API key
 *     tags:
 *     - custom-inputs
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No eventTypeCustomInputs were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  const args: Prisma.EventTypeCustomInputFindManyArgs = isAdmin ? {} : { where: { eventType: { userId } } };
  const data = await prisma.eventTypeCustomInput.findMany(args);
  return { event_type_custom_inputs: data.map((v) => schemaEventTypeCustomInputPublic.parse(v)) };
}

export default defaultResponder(getHandler);
