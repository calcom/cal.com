import { TFunction } from "next-i18next";

import { DYNAMIC_TEXT_VARIABLES } from "./constants";

export function getTranslatedText(text: string, language: { locale: string; t: TFunction }) {
  let translatedText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      const regex = new RegExp(`{${variable}}`, "g"); // .replaceAll is not available here for some reason
      const translatedVariable = DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase())
        ? language.t(variable.toLowerCase().concat("_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase().concat("_name")) //for the old variables names (ORGANIZER_NAME, ATTENDEE_NAME)
        ? language.t(variable.toLowerCase().concat("_name_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : variable;

      translatedText = translatedText.replace(regex, `{${translatedVariable}}`);
    });
  }

  return translatedText;
}

export function translateVariablesToEnglish(text: string, language: { locale: string; t: TFunction }) {
  let newText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      DYNAMIC_TEXT_VARIABLES.forEach((originalVar) => {
        const newVariableName = variable.replace("_NAME", "");
        const originalVariable = `${originalVar}_variable`;
        if (
          language.t(originalVariable).replace(/ /g, "_").toUpperCase() === variable ||
          language.t(originalVariable).replace(/ /g, "_").toUpperCase() === newVariableName
        ) {
          newText = newText.replace(
            variable,
            language.t(originalVariable, { lng: "en" }).replace(/ /g, "_").toUpperCase()
          );
          return;
        }
      });
    });
  }

  return newText;
}
