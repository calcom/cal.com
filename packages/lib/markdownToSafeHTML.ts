import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";

if (typeof window !== "undefined") {
  console.warn("`markdownToSafeHTML` should not be imported on the client side.");
}

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return "";

  const html = md.render(markdown);
  const safeHTML = sanitizeHtml(html);

  const fixedHTML = fixNestedLists(safeHTML);

  const safeHTMLWithListFormatting = fixedHTML
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

function fixNestedLists(html: string): string {
  const patterns = [
    // Double-wrapped strong tags with ul
    /<li>\s*<strong><strong>([^<]+)<\/strong><\/strong>\s*<\/li>\s*<li>\s*(<ul[^>]*>.*?<\/ul>)\s*<\/li>/gs,
    // Single-wrapped strong tags with ul
    /<li>\s*<strong>([^<]+)<\/strong>\s*<\/li>\s*<li>\s*(<ul[^>]*>.*?<\/ul>)\s*<\/li>/gs,
    // Double-wrapped strong tags with ol
    /<li>\s*<strong><strong>([^<]+)<\/strong><\/strong>\s*<\/li>\s*<li>\s*(<ol[^>]*>.*?<\/ol>)\s*<\/li>/gs,
    // Single-wrapped strong tags with ol
    /<li>\s*<strong>([^<]+)<\/strong>\s*<\/li>\s*<li>\s*(<ol[^>]*>.*?<\/ol>)\s*<\/li>/gs,
  ];

  let result = html;

  patterns.forEach((pattern) => {
    result = result.replace(pattern, (match, title, listContent) => {
      const cleanTitle = title.trim();
      return `<li><strong>${cleanTitle}</strong>${listContent}</li>`;
    });
  });

  return result;
}
