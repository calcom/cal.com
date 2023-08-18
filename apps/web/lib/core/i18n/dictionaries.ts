import "server-only";

type Dictionaries = {
  en: () => Promise<typeof import("../../../public/static/locales/en/common.json")>;
  nl: () => Promise<typeof import("../../../public/static/locales/nl/common.json")>;
};

const dictionaries: Dictionaries = {
  en: () => import("../../../public/static/locales/en/common.json").then((module) => module.default),
  nl: () => import("../../../public/static/locales/nl/common.json").then((module) => module.default),
};

export const getDictionary = async (locale: keyof typeof dictionaries) => dictionaries[locale]();
