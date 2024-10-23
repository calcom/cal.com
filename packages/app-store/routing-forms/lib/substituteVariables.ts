import slugify from "@calcom/lib/slugify";

import type { FormResponse, NonRouterRoute, Field } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";

export const substituteVariables = (
  routeValue: NonRouterRoute["action"]["value"],
  response: FormResponse,
  fields: Field[]
) => {
  const regex = /\{([^\}]+)\}/g;
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
        eventTypeUrl = eventTypeUrl.replace(`{${variable}}`, slugify(response[key].value.toString() || ""));
      }
    }
  });

  return eventTypeUrl;
};
