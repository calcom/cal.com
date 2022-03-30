import { withValidation } from "next-validations";

import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

export const schemaEventTypeBodyParams = EventType.omit({ id: true });

export const schemaEventTypePublic = EventType.omit({});

export const withValidEventType = withValidation({
  schema: schemaEventTypeBodyParams,
  type: "Zod",
  mode: "body",
});
