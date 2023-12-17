import z from "zod";

const rawDataInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional().nullable(),
  userId: z.coerce.number().optional().nullable(),
  memberUserId: z.coerce.number().optional().nullable(),
  isAll: z.coerce.boolean().optional(),
  eventTypeId: z.coerce.number().optional().nullable(),
});

export type RawDataInput = z.infer<typeof rawDataInputSchema>;

export { rawDataInputSchema };
