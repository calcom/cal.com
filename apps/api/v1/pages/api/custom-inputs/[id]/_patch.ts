import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import {
  schemaEventTypeCustomInputEditBodyParams,
  schemaEventTypeCustomInputPublic,
} from "~/lib/validations/event-type-custom-input";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /custom-inputs/{id}:
 *   patch:
 *     summary: Edit an existing eventTypeCustomInput
 *     requestBody:
 *        description: Edit an existing eventTypeCustomInput for an event type
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
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
 *                summary: Example of patching an existing Custom Input
 *                value:
 *                  required: true
 *
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventTypeCustomInput to edit
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput edited successfully
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaEventTypeCustomInputEditBodyParams.parse(req.body);
  const result = await prisma.eventTypeCustomInput.update({
    where: { id },
    data: {
      ...data,
      options: data.options === null ? [] : data.options,
    },
  });
  return { event_type_custom_input: schemaEventTypeCustomInputPublic.parse(result) };
}

export default defaultResponder(patchHandler);
