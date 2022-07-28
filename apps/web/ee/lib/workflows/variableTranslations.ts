import { TFunction } from "next-i18next";

export function getTranslatedText(text: string, language: { locale: string; t: TFunction }) {
  let translatedText = text;

  if (language.locale !== "en") {
    const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
      return variable.replace("{", "").replace("}", "");
    });

    variables?.forEach((variable) => {
      translatedText = translatedText.replaceAll(
        variable,
        language.t(variable.toLowerCase().concat("_workflow")).replaceAll(" ", "_").toLocaleUpperCase()
      );
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

    const originalVariables = [
      "event_name_workflow",
      "organizer_name_workflow",
      "attendee_name_workflow",
      "event_date_workflow",
      "event_time_workflow",
      "location_workflow",
      "additional_notes_workflow",
    ];
    variables?.forEach((variable) => {
      originalVariables.forEach((originalVariable) => {
        if (language.t(originalVariable).replaceAll(" ", "_").toUpperCase() === variable) {
          newText = newText.replace(
            variable,
            language.t(originalVariable, { lng: "en" }).replace(" ", "_").toUpperCase()
          );
          return;
        }
      });
    });
  }

  return newText;
}
