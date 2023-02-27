import { isSupportedCountry } from "libphonenumber-js";
import type { NextApiRequest, NextApiResponse } from "next";

/** @type {import("next-i18next").UserConfig} */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import i18nConfig from "@calcom/config/next-i18next.config.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  function countryList(lang = "en") {
    const A = 65;
    const Z = 90;
    const countryName = new Intl.DisplayNames([lang], { type: "region" });
    const countries: { [x: string]: { name?: string } } = {};
    for (let i = A; i <= Z; ++i) {
      for (let j = A; j <= Z; ++j) {
        const code = String.fromCharCode(i) + String.fromCharCode(j);
        const name = countryName.of(code);
        if (code !== name && isSupportedCountry(code)) {
          countries[code] = { name };
        }
      }
    }

    return countries;
  }

  const countries = (i18nConfig.i18n.locales as string[]).reduce(
    (arr: { [x: string]: ReturnType<typeof countryList> }, locale) => {
      arr[locale] = countryList(locale);
      return arr;
    },
    {}
  );

  return res.status(200).json({ countries });
}
