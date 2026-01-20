import { EventTypeCustomInputSchema } from "@calcom/prisma/zod/modelSchema/EventTypeCustomInputSchema";

export const schemaEventTypeCustomInputBaseBodyParams = EventTypeCustomInputSchema.omit({
  id: true,
});

export const schemaEventTypeCustomInputPublic = EventTypeCustomInputSchema.omit({});

export const schemaEventTypeCustomInputBodyParams = schemaEventTypeCustomInputBaseBodyParams.strict();

export const schemaEventTypeCustomInputEditBodyParams = schemaEventTypeCustomInputBaseBodyParams
  .partial()
  .strict();
