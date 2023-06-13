import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return "";

  const html = md.render(markdown);

  const safeHTML = sanitizeHtml(html);

  const safeHTMLWithListFormatting = safeHTML
    .replace(
      /<ul>/g,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<ol>/g,
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    );

  return safeHTMLWithListFormatting;
}
