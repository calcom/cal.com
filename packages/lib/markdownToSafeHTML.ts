import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";

if (typeof window !== "undefined") {
  // This file imports markdown parser which is a costly dependency, so we want to make sure it's not imported on the client side.
  // It is still imported at some places on client in non-booker pages, we can gradually remove it from there and then convert it into an error
  console.warn("`markdownToSafeHTML` should not be imported on the client side.");
}

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
    )
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=");

  return safeHTMLWithListFormatting;
}
