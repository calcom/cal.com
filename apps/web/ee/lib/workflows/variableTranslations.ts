import { TFunction } from "next-i18next";

export function getTranslatedText(text: string, t: TFunction) {
  const variables = text.match(/\{(.+?)}/g)?.map((variable) => {
    return variable.replace("{", "").replace("}", "");
  });

  let translatedText = text;

  variables?.forEach((variable) => {
    translatedText = translatedText.replaceAll(
      variable,
      t(variable.toLowerCase().concat("_workflow")).replaceAll(" ", "_").toLocaleUpperCase()
    );
  });

  return translatedText;
}

export function translateTextToEnglish(text: string, t: TFunction) {
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
  ];
  let newText = text;
  variables?.forEach((variable) => {
    originalVariables.forEach((originalVariable) => {
      if (t(originalVariable).replaceAll(" ", "_").toUpperCase() === variable) {
        newText = newText.replace(
          variable,
          t(originalVariable, { lng: "en" }).replace(" ", "_").toUpperCase()
        );
        return;
      }
    });
  });

  return newText;
}
