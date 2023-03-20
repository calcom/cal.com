import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import { md } from "@calcom/lib/markdownIt";

export function parseAndSanitize(description: string) {
  const window = new JSDOM("").window;
  // @ts-expect-error as suggested here: https://github.com/cure53/DOMPurify/issues/437#issuecomment-632021941
  const purify = DOMPurify(window);
  const parsedMarkdown = purify.sanitize(md.render(description));
  return parsedMarkdown;
}
