import { z } from "zod";

export const i18nInputSchema = z.object({
  locale: z.string(),
  CalComVersion: z.string(),
});

export type I18nInputSchema = z.infer<typeof i18nInputSchema>;
