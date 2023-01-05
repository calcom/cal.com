import { TFunction } from "next-i18next";

const originalVariables = [
  "event_name_workflow",
  "organizer_name_workflow",
  "attendee_name_workflow",
  "event_date_workflow",
  "event_time_workflow",
  "location_workflow",
  "additional_notes_workflow",
  "attendee_email_workflow",
  "meeting_url_workflow",
];

export function getTranslatedText(text: string, language: { locale: string; t: TFunction }) {
  let translatedText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      const regex = new RegExp(variable, "g"); // .replaceAll is not available here for some reason
      const translatedVariable = originalVariables.includes(variable.toLowerCase().concat("_workflow"))
        ? language.t(variable.toLowerCase().concat("_workflow")).replace(/ /g, "_").toLocaleUpperCase()
        : originalVariables.includes(variable.toLowerCase().concat("_name_workflow")) //for the old variables names (ORGANIZER_NAME, ATTENDEE_NAME)
        ? language.t(variable.toLowerCase().concat("_name_workflow")).replace(/ /g, "_").toLocaleUpperCase()
        : variable;

      translatedText = translatedText.replace(regex, translatedVariable);
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
