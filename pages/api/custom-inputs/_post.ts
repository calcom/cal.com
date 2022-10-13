import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
} from "@lib/validations/event-type-custom-input";

/**
 * @swagger
 * /custom-inputs:
 *   post:
 *     summary: Creates a new eventTypeCustomInput
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput created
 *       400:
 *        description: Bad request. EventTypeCustomInput body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { eventTypeId, ...body } = schemaEventTypeCustomInputBodyParams.parse(req.body);

  if (!isAdmin) {
    /* We check that the user has access to the event type he's trying to add a custom input to. */
    const eventType = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });
    if (!eventType) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  const data = await prisma.eventTypeCustomInput.create({
    data: { ...body, eventType: { connect: { id: eventTypeId } } },
  });

  return {
    event_type_custom_input: schemaEventTypeCustomInputPublic.parse(data),
    message: "EventTypeCustomInput created successfully",
  };
}

export default defaultResponder(postHandler);
