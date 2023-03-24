import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return null;

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

  const safeHTML = sanitizeHtml(html);

  return safeHTML;
}
