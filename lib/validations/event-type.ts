import { withValidation } from "next-validations";
import { z } from "zod";

import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

export const schemaEventTypeBaseBodyParams = EventType.omit({ id: true }).partial();

const schemaEventTypeRequiredParams = z.object({
  title: z.string(),
  slug: z.string(),
  length: z.number(),
});

export const schemaEventTypeBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeRequiredParams);

export const schemaEventTypePublic = EventType.omit({});

export const withValidEventType = withValidation({
  schema: schemaEventTypeBodyParams,
  type: "Zod",
  mode: "body",
});
