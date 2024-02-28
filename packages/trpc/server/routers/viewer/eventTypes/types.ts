import { z } from "zod";

import { _DestinationCalendarModel, _EventTypeModel } from "@calcom/prisma/zod";
import { customInputSchema, EventTypeMetaDataSchema, stringOrNumber } from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

export const EventTypeUpdateInput = _EventTypeModel
  /** Optional fields */
  .extend({
    isInstantEvent: z.boolean().optional(),
    customInputs: z.array(customInputSchema).optional(),
    destinationCalendar: _DestinationCalendarModel
      .pick({
        integration: true,
        externalId: true,
      })
      .nullable(),
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
          profileId: z.number().or(z.null()).optional(),
          isFixed: z.boolean().optional(),
          priority: z.number().optional().nullable(),
        })
      )
      .optional(),
    schedule: z.number().nullable().optional(),
    hashedLink: z.string(),
    assignAllTeamMembers: z.boolean().optional(),
  })
  .partial()
  .extend({
    metadata: EventTypeMetaDataSchema.optional(),
    bookingFields: eventTypeBookingFields.optional(),
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
