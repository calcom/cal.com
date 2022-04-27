import { z } from "zod";

import { _EventTypeCustomInputModel as EventTypeCustomInput } from "@calcom/prisma/zod";

export const schemaEventTypeCustomInputBaseBodyParams = EventTypeCustomInput.omit({
  id: true,
  eventTypeId: true,
}).partial();

export const schemaEventTypeCustomInputPublic = EventTypeCustomInput.omit({});

const schemaEventTypeCustomInputRequiredParams = z.object({
  label: z.string(),
  required: z.boolean(),
  type: z.enum(["TEXT", "TEXTLONG", "NUMBER", "BOOL"]),
  eventType: z.object({
    connect: z.object({
      id: z.number().optional(),
    }),
    // FIXME: Provide valid EventTypeModel schema here, but not sure how yet.
    create: z.any(),
  }),
});

export const schemaEventTypeCustomInputBodyParams = schemaEventTypeCustomInputBaseBodyParams.merge(
  schemaEventTypeCustomInputRequiredParams
);
