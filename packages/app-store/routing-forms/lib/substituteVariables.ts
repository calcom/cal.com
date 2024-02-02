import slugify from "@calcom/lib/slugify";

import type { Field } from "../types/types";
import type { Response, Route } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";

export const substituteVariables = (
  routeValue: Route["action"]["value"],
  response: Response,
  fields: Field[]
) => {
  const regex = /\{([^\}]+)\}/g;
  const variables: string[] = routeValue.match(regex)?.map((match: string) => match.slice(1, -1)) || [];

  let eventTypeUrl = routeValue;

  variables.forEach((variable) => {
    for (const key in response) {
      const identifier = getFieldIdentifier(fields.find((field) => field.id === key));
      if (identifier.toLowerCase() === variable.toLowerCase()) {
        eventTypeUrl = eventTypeUrl.replace(`{${variable}}`, slugify(response[key].value.toString() || ""));
      }
    }
  });

  return eventTypeUrl;
};
