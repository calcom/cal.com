import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { nextI18nInterop } from "@calcom/lib/i18n/_utils/nextI18nInterop";

// NOTE: This file is only run on app folder.
export default getRequestConfig(async (props) => {
  const locale =
    cookies().get("calcom-locale")?.value ||
    (await import("@calcom/lib/server/accept-header")).acceptLanguage();
  // prettier-ignore
  const messages = (await import(`../public/static/locales/${locale}/common.json`, {
    // prettier-ignore
    with: {
      // prettier-ignore
      type: "json",
      // prettier-ignore
    }
    // prettier-ignore
  })).default;

  nextI18nInterop(messages);

  return {
    locale,
    messages,
  };
});
