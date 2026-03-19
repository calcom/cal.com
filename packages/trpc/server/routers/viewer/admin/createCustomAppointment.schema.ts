import { z } from "zod";

export const ZCreateCustomAppointmentSchema = z.object({
  targetUserId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
  })),
});

export type TCreateCustomAppointmentInputSchema = z.infer<typeof ZCreateCustomAppointmentSchema>;