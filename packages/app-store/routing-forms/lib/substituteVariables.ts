import type { Field, FormResponse, NonRouterRoute } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";
import { getHumanReadableFieldResponseValue } from "./responseData/getHumanReadableFieldResponseValue";

/**
 * Substitues variables in the target URL identified by routeValue with values from response
 * e.g. {firstName} is replaced with value of the field with identifier firstName
 *
 * @param routeValue - The target URL with variables to be substituted
 * @param response - The form response containing the values to be substituted
 * @param fields - The fields of the form
 * @returns The URL with variables substituted
 */
export const substituteVariables = (
  routeValue: NonRouterRoute["action"]["value"],
  response: FormResponse,
  fields: Field[]
) => {
  const regex = /\{([^}]+)\}/g;
  const variables: string[] = routeValue.match(regex)?.map((match: string) => match.slice(1, -1)) || [];

  let eventTypeUrl = routeValue;

  variables.forEach((variable) => {
    for (const key in response) {
      const field = fields.find((field) => field.id === key);
      if (!field) {
        continue;
      }
      const identifier = getFieldIdentifier(field);
      if (identifier.toLowerCase() === variable.toLowerCase()) {
        const humanReadableValues = getHumanReadableFieldResponseValue({
          field,
          value: response[key].value,
        });
        // ['abc', 'def'] ----toString---> 'abc,def' ----encode---> 'abc%2Cdef'
        const valueToSubstitute = encodeURIComponent(humanReadableValues.toString());
        eventTypeUrl = eventTypeUrl.replace(`{${variable}}`, valueToSubstitute);
      }
    }
  });

  return eventTypeUrl;
};
