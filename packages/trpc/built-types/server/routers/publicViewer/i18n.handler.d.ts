import type { I18nInputSchema } from "./i18n.schema";
type I18nOptions = {
    input: I18nInputSchema;
};
export declare const i18nHandler: ({ input }: I18nOptions) => Promise<{
    i18n: import("next-i18next").SSRConfig;
    locale: string;
}>;
export default i18nHandler;
