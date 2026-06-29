/**
 * Post-process sanitized markdown HTML for Cal UI (lists, links, headings).
 * Tailwind preflight resets heading sizes; inject utility classes at render time.
 */
export function applyMarkdownHtmlFormatting(html: string): string {
  let formatted = html
    .replace(
      /<ul>/g,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<ol>/g,
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<a\s+href=/g,
      "<a target='_blank' rel='noopener noreferrer' class='text-blue-500 hover:text-blue-600' href="
    )
    .replace(/<h1>/g, "<h1 class='text-2xl font-semibold mb-2'>")
    .replace(/<h2>/g, "<h2 class='text-xl font-semibold mb-2'>")
    .replace(/<h3>/g, "<h3 class='text-lg font-semibold mb-1'>")
    .replace(/<h4>/g, "<h4 class='text-base font-semibold mb-1'>")
    .replace(/<h5>/g, "<h5 class='text-sm font-semibold mb-1'>")
    .replace(/<h6>/g, "<h6 class='text-xs font-semibold mb-1'>");

  // Match: <li>Some text </li><li><ul>...</ul></li>
  // Convert to: <li>Some text <ul>...</ul></li>
  formatted = formatted.replace(
    /<li>([^<]+|<strong>.*?<\/strong>)<\/li>\s*<li>\s*<ul([^>]*)>([\s\S]*?)<\/ul>\s*<\/li>/g,
    "<li>$1<ul$2>$3</ul></li>"
  );

  return formatted;
}
