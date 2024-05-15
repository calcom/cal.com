import { z } from "zod";

export const appSettingsSchema = z.object({
  bookings: z.object({
    modified: z.object({
      reschedule: z.boolean(),
    }),
  }),
});

export const appKeysSchema = z.object({
  api_key: z.string().min(1),
  project_Id: z.string().min(1),
});

export const appDataSchema = z.object({});
