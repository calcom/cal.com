import type { PrismaClient } from "@prisma/client";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt("zero").enable([
  //
  "emphasis",
  "list",
  "newline",
  "strikethrough",
]);

function parseAndSanitize(description: string) {
  const parsedMarkdown = md.render(description);
  return parsedMarkdown;
}

/**
 * Parses event type descriptions and treat them as markdown,
 * then sanitizes the resulting HTML and adds a new `descriptionAsSafeHTML` property.
 */
function eventTypeDescriptionParseAndSanitize(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (params.model === "EventType") {
      const result = await next(params);
      if (result) {
        const results = Array.isArray(result) ? result : [result];
        const parsedResults = results.map((record) => ({
          ...record,
          descriptionAsSafeHTML: record.description ? parseAndSanitize(record.description) : null,
        }));
        /* If the original result was an array, return the parsed array, otherwise is a single record */
        return Array.isArray(result) ? parsedResults : parsedResults[0];
      }
      return result;
    }
    return next(params);
  });
}

export default eventTypeDescriptionParseAndSanitize;
