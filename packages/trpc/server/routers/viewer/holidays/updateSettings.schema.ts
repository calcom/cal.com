import { z } from "zod";

export const ZUpdateSettingsSchema = z.object({
  countryCode: z.string().nullable(),
  // When changing country, optionally reset disabled holidays
  resetDisabledHolidays: z.boolean().optional().default(true),
});

export type TUpdateSettingsSchema = z.infer<typeof ZUpdateSettingsSchema>;

