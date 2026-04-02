import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
} from "~/lib/validations/event-type-custom-input";

/**
 * @swagger
 * /custom-inputs:
 *   post:
 *     summary: Creates a new eventTypeCustomInput
 *     parameters:
 *        - in: query
 *          name: apiKey
 *          required: true
 *          schema:
 *            type: string
 *          description: Your API key
 *     requestBody:
 *        description: Create a new custom input for an event type
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - eventTypeId
 *                - label
 *                - type
 *                - required
 *                - placeholder
 *              properties:
 *                eventTypeId:
 *                  type: integer
 *                  description: 'ID of the event type to which the custom input is being added'
 *                label:
 *                  type: string
 *                  description: 'Label of the custom input'
 *                type:
 *                  type: string
 *                  description: 'Type of the custom input. The value is ENUM; one of [TEXT, TEXTLONG, NUMBER, BOOL, RADIO, PHONE]'
 *                options:
 *                  type: object
 *                  properties:
 *                    label:
 *                      type: string
 *                    type:
 *                      type: string
 *                  description: 'Options for the custom input'
 *                required:
 *                  type: boolean
 *                  description: 'If the custom input is required before booking'
 *                placeholder:
 *                  type: string
 *                  description: 'Placeholder text for the custom input'
 *
 *            examples:
 *              custom-inputs:
 *                summary: An example of custom-inputs
 *                value:
 *                  eventTypeID: 1
 *                  label: "Phone Number"
 *                  type: "PHONE"
 *                  required: true
 *                  placeholder: "100 101 1234"
 *
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
  const { userId, isSystemWideAdmin } = req;
  const { eventTypeId, ...body } = schemaEventTypeCustomInputBodyParams.parse(req.body);

  if (!isSystemWideAdmin) {
    /* We check that the user has access to the event type he's trying to add a custom input to. */
    const eventType = await prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });
    if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }

  const data = await prisma.eventTypeCustomInput.create({
    data: {
      ...body,
      options: body.options === null ? [] : body.options,
      eventType: { connect: { id: eventTypeId } },
    },
  });

  return {
    event_type_custom_input: schemaEventTypeCustomInputPublic.parse(data),
    message: "EventTypeCustomInput created successfully",
  };
}

export default defaultResponder(postHandler);
