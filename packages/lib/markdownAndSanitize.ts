import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import { md } from "@calcom/lib/markdownIt";

export function markdownAndSanitize(markdown: string | null) {
  if (!markdown) return null;

  const window = new JSDOM("").window;
  // @ts-expect-error as suggested here: https://github.com/cure53/DOMPurify/issues/437#issuecomment-632021941
  const purify = DOMPurify(window);

  const html = md
    .render(markdown)
    .replaceAll(
      "<ul>",
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replaceAll(
      "<ol>",
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    );
  const safeHtml = purify.sanitize(html);
  return safeHtml;
}
