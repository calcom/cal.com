import parser from "accept-language-parser";
import { headers } from "next/headers";

import { i18n } from "@calcom/config/next-i18next.config";

export const acceptLanguage = () =>
  parser.pick(i18n.locales, headers().get("accept-language"), {
    loose: true,
  });
