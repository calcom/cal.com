/* eslint-disable @typescript-eslint/no-var-requires */
import parser from "accept-language-parser";
import { IncomingMessage } from "http";

import { Maybe } from "@calcom/trpc/server";

const { i18n } = require("@calcom/config/next-i18next.config");

export function getLocaleFromHeaders(req: IncomingMessage): string {
  let preferredLocale: string | null | undefined;
  if (req.headers["accept-language"]) {
    preferredLocale = parser.pick(i18n.locales, req.headers["accept-language"]) as Maybe<string>;
  }
  return preferredLocale ?? i18n.defaultLocale;
}

export const getDirFromLang = (locale: string | undefined) =>
  locale === "ar" || locale === "he" ? "rtl" : "ltr";
