import z from "zod";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { i18n } = require("@calcom/config/next-i18next.config");

export const ZI18nInputSchema = z.object({
  locale: z.string().default(i18n.defaultLocale as string),
});

export type TI18nInputSchema = z.infer<typeof ZI18nInputSchema>;
