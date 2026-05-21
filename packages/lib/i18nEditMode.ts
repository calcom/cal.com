const DATA_I18N_EDITABLE = "data-i18n-editable";
const DATA_I18N_KEY = "data-i18n-key";
const DATA_I18N_LOCALE = "data-i18n-locale";

type I18nEditAttributes = {
  [DATA_I18N_EDITABLE]: "true";
  [DATA_I18N_KEY]: string;
  [DATA_I18N_LOCALE]: string;
};

export const getI18nEditAttributes = (key: string, locale: string | undefined): I18nEditAttributes => {
  return {
    [DATA_I18N_EDITABLE]: "true",
    [DATA_I18N_KEY]: key,
    [DATA_I18N_LOCALE]: locale || "en",
  };
};
