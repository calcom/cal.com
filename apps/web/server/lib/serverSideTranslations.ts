import { serverSideTranslations as _serverSideTranslations } from "next-i18next/serverSideTranslations";

//@ts-expect-error no type definitions
import config from "@calcom/web/next-i18next.config";

export const serverSideTranslations: typeof _serverSideTranslations = async (locale, namespaces) => {
  return _serverSideTranslations(locale, namespaces, config);
};
