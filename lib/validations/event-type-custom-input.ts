import { withValidation } from "next-validations";
import { z } from "zod";

import { EventTypeModel, _EventTypeCustomInputModel as EventTypeCustomInput } from "@calcom/prisma/zod";

export const schemaEventTypeCustomInputBaseBodyParams = EventTypeCustomInput.omit({
  id: true,
  eventTypeId: true,
}).partial();

export const schemaEventTypeCustomInputPublic = EventTypeCustomInput.omit({});

const schemaEventTypeCustomInputRequiredParams = z.object({
  label: z.string(),
  // uid: z.string(),
  eventType: EventTypeModel.optional(),

  // eventType: z.instanceof(EventTypeInputModel),
});

export const schemaEventTypeCustomInputBodyParams = schemaEventTypeCustomInputBaseBodyParams.merge(
  schemaEventTypeCustomInputRequiredParams
);

export const withValidEventTypeCustomInput = withValidation({
  schema: schemaEventTypeCustomInputBodyParams,
  type: "Zod",
  mode: "body",
});
