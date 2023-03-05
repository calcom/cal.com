import { isSupportedCountry } from "libphonenumber-js";

/** @type {import("next-i18next").UserConfig} */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

function listSupportedCountriesByLanguage(lang = "en") {
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

export default listSupportedCountriesByLanguage;
