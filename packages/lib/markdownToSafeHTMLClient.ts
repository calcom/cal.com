import DOMPurify from "dompurify";

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
