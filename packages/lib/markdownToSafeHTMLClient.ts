import DOMPurify from "dompurify";

import { applyMarkdownHtmlFormatting } from "@calcom/lib/markdownHtmlFormatting";
import { md } from "@calcom/lib/markdownIt";

if (typeof window == "undefined") {
  console.warn(
    "`markdownToSafeHTMLClient` should not be used on the server side. use markdownToSafeHTML instead"
  );
}

export function markdownToSafeHTMLClient(markdown: string | null) {
  if (!markdown) return "";

  const html = md.render(markdown);

  const safeHTML = DOMPurify.sanitize(html);

  return applyMarkdownHtmlFormatting(safeHTML);
}
