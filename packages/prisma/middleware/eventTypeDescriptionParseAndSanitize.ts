import type { PrismaClient, EventType } from "@prisma/client";

import { md } from "@calcom/lib/markdownIt";

function parseAndSanitize(description: string) {
  const parsedMarkdown = md.render(description);
  return parsedMarkdown;
}

function getParsedResults(eventTypes: EventType | EventType[]) {
  const results = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
  const parsedResults = results.map((record) => ({
    ...record,
    descriptionAsSafeHTML: record.description ? parseAndSanitize(record.description) : null,
  }));
  /* If the original result was an array, return the parsed array, otherwise is a single record */
  return Array.isArray(eventTypes) ? parsedResults : parsedResults[0];
}

/**
 * Parses event type descriptions and treat them as markdown,
 * then sanitizes the resulting HTML and adds a new `descriptionAsSafeHTML` property.
 */
function eventTypeDescriptionParseAndSanitize(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (params.model === "Team") {
      const result = await next(params);
      if (result?.eventTypes) {
        result.eventTypes = getParsedResults(result.eventTypes);
      }
      return result;
    } else if (params.model === "EventType") {
      const result = await next(params);
      if (result) {
        return getParsedResults(result);
      }
      return result;
    }
    return next(params);
  });
}

export default eventTypeDescriptionParseAndSanitize;
