import { z } from "zod";

export const ZCreateCustomAppointmentSchema = z.object({
  targetUserId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    timeZone: z.string(),
  })).min(1),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type TCreateCustomAppointmentInputSchema = z.infer<typeof ZCreateCustomAppointmentSchema>;
