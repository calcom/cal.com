import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const ns = ["common"];
const supportedLngs = ["en", "fr"];
const resources = ns.reduce((acc, n) => {
  supportedLngs.forEach((lng) => {
    if (!acc[lng]) acc[lng] = {};
    acc[lng] = {
      ...acc[lng],
      [n]: require(`../../web/public/static/locales/${lng}/${n}.json`),
    };
  });
  return acc;
}, {});

i18n.use(initReactI18next).init({
  debug: true,
  fallbackLng: "en",
  defaultNS: "common",
  ns,
  interpolation: {
    escapeValue: false,
  },
  react: { useSuspense: true },
  resources,
});

export default i18n;
