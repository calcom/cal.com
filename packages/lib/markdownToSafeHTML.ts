import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";
import { applyMarkdownHTMLFormatting } from "@calcom/lib/markdownHTMLFormatting";

if (typeof window !== "undefined") {
  // This file imports markdown parser which is a costly dependency, so we want to make sure it's not imported on the client side.
  // It is still imported at some places on client in non-booker pages, we can gradually remove it from there and then convert it into an error
  console.warn("`markdownToSafeHTML` should not be imported on the client side.");
}

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return "";

  const html = md.render(markdown);

  const safeHTML = sanitizeHtml(html);

  return applyMarkdownHTMLFormatting(safeHTML);
}
