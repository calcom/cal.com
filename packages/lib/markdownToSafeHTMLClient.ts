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

  let safeHTMLWithListFormatting = safeHTML
    .replace(
      /<ul>/g,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<ol>/g,
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=");

  // Match: <li>Some text </li><li><ul>...</ul></li> or
  // Convert to: <li>Some text <ul>...</ul></li>
  safeHTMLWithListFormatting = safeHTMLWithListFormatting.replace(
    /<li>([^<]+|<strong>.*?<\/strong>)<\/li>\s*<li>\s*<ul([^>]*)>([\s\S]*?)<\/ul>\s*<\/li>/g,
    "<li>$1<ul$2>$3</ul></li>"
  );

  return safeHTMLWithListFormatting;
}
