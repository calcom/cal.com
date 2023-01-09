import { TFunction } from "next-i18next";

const originalVariables = [
  "event_name_variable",
  "organizer_name_variable",
  "attendee_name_variable",
  "event_date_variable",
  "event_time_variable",
  "location_variable",
  "additional_notes_variable",
  "attendee_email_variable",
  "meeting_url_variable",
];

export function getTranslatedText(text: string, language: { locale: string; t: TFunction }) {
  let translatedText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      const regex = new RegExp(`{${variable}}`, "g"); // .replaceAll is not available here for some reason
      const translatedVariable = originalVariables.includes(variable.toLowerCase().concat("_variable"))
        ? language.t(variable.toLowerCase().concat("_variable")).replace(/ /g, "_").toLocaleUpperCase()
        : originalVariables.includes(variable.toLowerCase().concat("_name_variable")) //for the old variables names (ORGANIZER_NAME, ATTENDEE_NAME)
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
      originalVariables.forEach((originalVariable) => {
        const newVariableName = variable.replace("_NAME", "");
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
