import parser from "accept-language-parser";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { i18n } = require("@calcom/config/next-i18next.config");

export const i18nInputSchema = z.object({
  locale: z
    .string()
    .min(2)
    .transform((locale) => parser.pick<string>(i18n.locales, locale, { loose: true }) || locale),
  CalComVersion: z.string(),
});

export type I18nInputSchema = z.infer<typeof i18nInputSchema>;
