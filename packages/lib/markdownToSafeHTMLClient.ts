import { md } from "@calcom/lib/markdownIt";
import DOMPurify from "dompurify";

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
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=")
    .replace(/<h1/g, "<h1 class='mt-6 mb-4 text-2xl font-semibold'")
    .replace(/<h2/g, "<h2 class='mt-5 mb-3 text-xl font-semibold'")
    .replace(/<h3/g, "<h3 class='mt-4 mb-2 text-lg font-semibold'")
    .replace(/<h4/g, "<h4 class='mt-4 mb-2 text-base font-semibold'")
    .replace(/<h5/g, "<h5 class='mt-4 mb-2 text-sm font-semibold'")
    .replace(/<h6/g, "<h6 class='mt-4 mb-2 text-xs font-semibold'");

  // Match: <li>Some text </li><li><ul>...</ul></li> or
  // Convert to: <li>Some text <ul>...</ul></li>
  safeHTMLWithListFormatting = safeHTMLWithListFormatting.replace(
    /<li>([^<]+|<strong>.*?<\/strong>)<\/li>\s*<li>\s*<ul([^>]*)>([\s\S]*?)<\/ul>\s*<\/li>/g,
    "<li>$1<ul$2>$3</ul></li>"
  );

  return safeHTMLWithListFormatting;
}
