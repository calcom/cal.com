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
// @NOTE: Removing locations and metadata properties before validation, add them later if required
export const schemaEventTypePublic = EventType.omit({ locations: true, metadata: true });

export const withValidEventType = withValidation({
  schema: schemaEventTypeBodyParams,
  type: "Zod",
  mode: "body",
});
