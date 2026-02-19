import { getEmailFromIdentifierKeyedResponse } from "./getEmailFromIdentifierKeyedResponse";

type FormField = {
  id: string;
  type: string;
  identifier?: string;
};

type FormResponseEntry = {
  value: string | number | string[];
  label: string;
  identifier?: string;
};

export function extractEmailsFromFormResponse(
  fields: FormField[],
  response: Record<string, FormResponseEntry>
): string[] {
  const identifierKeyedResponse = fields.reduce<Record<string, string | number | string[]>>(
    (acc, field) => {
      if (!field.identifier) return acc;

      const fieldResponse = response[field.id];
      if (!fieldResponse) return acc;

      acc[field.identifier] = fieldResponse.value;
      return acc;
    },
    {}
  );

  const bookerEmail = getEmailFromIdentifierKeyedResponse(identifierKeyedResponse);
  if (!bookerEmail) {
    return [];
  }

  return [bookerEmail];
}
