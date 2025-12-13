import { z } from "zod";

export const ZListOneOffMeetingsInputSchema = z
  .object({
    status: z.enum(["ACTIVE", "BOOKED", "EXPIRED", "CANCELLED"]).optional(),
    limit: z.number().min(1).max(100).default(50),
    cursor: z.string().optional(), // For pagination
  })
  .optional();

export type TListOneOffMeetingsInputSchema = z.infer<typeof ZListOneOffMeetingsInputSchema>;

