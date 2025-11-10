import MarkdownIt from "markdown-it";

export const md = new MarkdownIt({ html: true, breaks: true, linkify: true });

/**
 * Unescapes markdown characters that may have been escaped by turndown
 * This handles legacy data where turndown escaped markdown syntax
 */
export function unescapeMarkdown(markdown: string): string {
  if (!markdown) return "";

  return markdown
    .replace(/\\#/g, "#")
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\\`/g, "`")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\-/g, "-")
    .replace(/\\~/g, "~")
    .replace(/\\>/g, ">");
}
