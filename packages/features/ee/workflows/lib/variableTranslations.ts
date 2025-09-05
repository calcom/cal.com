import type { TFunction } from "i18next";

import { DYNAMIC_TEXT_VARIABLES, FORMATTED_DYNAMIC_TEXT_VARIABLES } from "./constants";

// variables are saved in the db always in english, so here we translate them to the user's language
export function getTranslatedText(text: string, language: { locale: string; t: TFunction }) {
  let translatedText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      const regex = new RegExp(`{${variable}}`, "g"); // .replaceAll is not available here for some reason
      let translatedVariable = DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase())
        ? language.t(variable.toLowerCase().concat("_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : DYNAMIC_TEXT_VARIABLES.includes(variable.toLowerCase().concat("_name")) //for the old variables names (ORGANIZER_NAME, ATTENDEE_NAME)
          ? language.t(variable.toLowerCase().concat("_name_variable")).replace(/ /g, "_").toLocaleUpperCase()
          : variable;

      // this takes care of translating formatted variables (e.g. {EVENT_DATE_DD MM YYYY})
      const formattedVarToTranslate = FORMATTED_DYNAMIC_TEXT_VARIABLES.map((formattedVar) => {
        if (variable.toLowerCase().startsWith(formattedVar)) return variable;
      })[0];

      if (formattedVarToTranslate) {
        // only translate the variable part not the formatting
        const variableName = formattedVarToTranslate
          .substring(0, formattedVarToTranslate?.lastIndexOf("_"))
          .toLowerCase()
          .concat("_variable");

        translatedVariable = language
          .t(variableName)
          .replace(/ /g, "_")
          .toLocaleUpperCase()
          .concat(formattedVarToTranslate?.substring(formattedVarToTranslate?.lastIndexOf("_")));
      }

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

      FORMATTED_DYNAMIC_TEXT_VARIABLES.forEach((formattedVar) => {
        const translatedVariable = language.t(`${formattedVar}variable`).replace(/ /g, "_").toUpperCase();
        if (variable.startsWith(translatedVariable)) {
          newText = newText.replace(translatedVariable, formattedVar.slice(0, -1).toUpperCase());
        }
      });
    });
  }

  return newText;
}
