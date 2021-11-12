import { z } from "zod";

const eventTypeSchema: { [field: string]: z.ZodObject<any> } = {
  post: z.object({
    title: z.string(),
    slug: z.string(),
    price: z.number().optional(),
    customInputs: z.array(
      z.object({
        id: z.number(),
        eventTypeId: z.number(),
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
        placeholder: z.string(),
      })
    ),
    minimumBookingNotice: z.number().optional(),
    length: z.number().optional(),
    team: z.number().optional(),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    requiresConfirmation: z.boolean().optional(),
    disableGuests: z.boolean().optional(),
    locations: z.array(z.object({}).catchall(z.unknown())).optional(),
    eventName: z.string().optional(),
    periodType: z.string().optional(),
    periodDays: z.number().optional(),
    periodStartDate: z.string().optional(),
    periodEndDate: z.string().optional(),
    periodCountCalendarDays: z.boolean().optional(),
    currency: z.string().optional(),
    schedulingType: z.string().optional(),
    timeZone: z.string().optional(),
    availability: z
      .object({
        // TODO: What is this?? where used this??
        dateOverrides: z.array(z.object({}).catchall(z.unknown())).optional(),
        openingHours: z.array(
          z.object({
            id: z.number().optional(),
            label: z.string().optional().nullable(),
            userId: z.string().optional().nullable(),
            date: z.string().optional().nullable(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            eventTypeId: z.number().optional(),
            days: z.array(z.number()),
            startTime: z.number(),
            endTime: z.number(),
          })
        ),
      })
      .optional(),
  }),
  patch: z.object({
    id: z.number(),
    title: z.string().optional(),
    slug: z.string().optional(),
    price: z.number().optional(),
    customInputs: z
      .array(
        z.object({
          id: z.number(),
          eventTypeId: z.number(),
          label: z.string(),
          type: z.string(),
          required: z.boolean(),
          placeholder: z.string(),
        })
      )
      .optional(),
    minimumBookingNotice: z.number().optional(),
    length: z.number().optional(),
    team: z.number().optional(),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    requiresConfirmation: z.boolean().optional(),
    disableGuests: z.boolean().optional(),
    locations: z.array(z.unknown()).optional(),
    eventName: z.string().optional(),
    periodType: z.string().optional(),
    periodDays: z.number().optional(),
    periodStartDate: z.string().optional(),
    periodEndDate: z.string().optional(),
    periodCountCalendarDays: z.boolean().optional(),
    currency: z.string().optional(),
    schedulingType: z.string().optional(),
    timeZone: z.string().optional(),
    availability: z
      .object({
        // TODO: What is this?? where used this??
        dateOverrides: z.array(z.object({}).catchall(z.unknown())).optional(),
        openingHours: z.array(
          z.object({
            id: z.number().optional(),
            label: z.string().optional().nullable(),
            userId: z.string().optional().nullable(),
            date: z.string().optional().nullable(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            eventTypeId: z.number().optional(),
            days: z.array(z.number()),
            startTime: z.number(),
            endTime: z.number(),
          })
        ),
      })
      .optional(),
  }),

  delete: z.object({
    id: z.number(),
  }),
};

export default eventTypeSchema;
