import { lookup } from "bcp-47-match";
import { z } from "zod";

import { i18n } from "@calcom/config/next-i18next.config";

export const i18nInputSchema = z.object({
  locale: z
    .string()
    .min(2)
    .transform((locale) => lookup(i18n.locales, locale) || locale),
  CalComVersion: z.string(),
});

export type I18nInputSchema = z.infer<typeof i18nInputSchema>;
