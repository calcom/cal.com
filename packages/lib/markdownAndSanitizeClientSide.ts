import DOMPurify from "dompurify";

import { md } from "./markdownIt";

export function markdownAndSanitize(markdown: string | null) {
  if (!markdown) return "";

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

  const safeHtml = DOMPurify.sanitize(html);
  return safeHtml;
}
