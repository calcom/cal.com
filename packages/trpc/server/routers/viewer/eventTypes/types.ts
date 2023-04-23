import { z } from "zod";

import { _DestinationCalendarModel, _EventTypeModel } from "@calcom/prisma/zod";
import { customInputSchema, EventTypeMetaDataSchema, stringOrNumber } from "@calcom/prisma/zod-utils";

export const EventTypeUpdateInput = _EventTypeModel
  /** Optional fields */
  .extend({
    customInputs: z.array(customInputSchema).optional(),
    destinationCalendar: _DestinationCalendarModel.pick({
      integration: true,
      externalId: true,
    }),
    users: z.array(stringOrNumber).optional(),
    children: z
      .array(
        z.object({
          owner: z.object({
            id: z.number(),
            name: z.string(),
            email: z.string(),
            eventTypeSlugs: z.array(z.string()),
          }),
          hidden: z.boolean(),
        })
      )
      .optional(),
    hosts: z
      .array(
        z.object({
          userId: z.number(),
          isFixed: z.boolean().optional(),
        })
      )
      .optional(),
    schedule: z.number().nullable().optional(),
    hashedLink: z.string(),
  })
  .partial()
  .extend({
    metadata: EventTypeMetaDataSchema.optional(),
  })
  .merge(
    _EventTypeModel
      /** Required fields */
      .pick({
        id: true,
      })
  );

export const EventTypeDuplicateInput = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  length: z.number(),
});
