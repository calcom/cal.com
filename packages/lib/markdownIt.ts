import MarkdownIt from "markdown-it";

export const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

export function addListFormatting(html: string) {
  return html
    .replaceAll("<ul>", "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px'>")
    .replaceAll(
      "<ol>",
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px'>"
    );
}
