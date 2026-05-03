/**
 * Browser-safe version of markdownToSafeHTML.
 * Uses only browser-compatible APIs — no Node.js built-ins.
 * Use this in client components instead of markdownToSafeHTML.
 */
export function markdownToSafeHTMLClient(markdown: string | null): string {
  if (!markdown) return "";

  const html = markdown

    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    .replace(/\*(.*?)\*/g, "<em>$1</em>")

    .replace(/`([^`]+)`/g, "<code>$1</code>")

    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      "<a target='_blank' class='text-blue-500 hover:text-blue-600' href='$2'>$1</a>"
    )

    .replace(/^[*-]\s+(.+)$/gm, "<li>$1</li>")

    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")

    .replace(
      /(<li>.*<\/li>)/gs,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>$1</ul>"
    )

    .replace(/\n/g, "<br />");

  return html;
}
