/**
 * Post-sanitize HTML rewrites applied to markdown output in both server
 * (markdownToSafeHTML) and client (markdownToSafeHTMLClient) renderers.
 *
 * Inline styles are used so the formatting survives Tailwind's preflight
 * CSS reset, which removes default heading sizes, weights, and margins.
 */
export function applyMarkdownHTMLFormatting(html: string): string {
  let formatted = html
    .replace(/<h1>/g, "<h1 style='font-size: 1.5em; font-weight: 700; margin-bottom: 8px'>")
    .replace(/<h2>/g, "<h2 style='font-size: 1.25em; font-weight: 700; margin-bottom: 6px'>")
    .replace(/<h3>/g, "<h3 style='font-size: 1.1em; font-weight: 600; margin-bottom: 4px'>")
    .replace(
      /<ul>/g,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<ol>/g,
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=");

  // Merge <li>text</li><li><ul>…</ul></li> → <li>text<ul>…</ul></li>
  formatted = formatted.replace(
    /<li>([^<]+|<strong>.*?<\/strong>)<\/li>\s*<li>\s*<ul([^>]*)>([\s\S]*?)<\/ul>\s*<\/li>/g,
    "<li>$1<ul$2>$3</ul></li>"
  );

  return formatted;
}
