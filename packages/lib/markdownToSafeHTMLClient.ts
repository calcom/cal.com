import DOMPurify from "dompurify";

import { md, unescapeMarkdown } from "./markdownIt";

/**
 * Converts markdown to safe HTML with inline styles for client-side use
 * Uses the centralized markdown-it instance from @calcom/lib/markdownIt
 *
 * @param markdown - The markdown string to convert
 * @returns Safe HTML string with inline styles
 */
export function markdownToSafeHTMLClient(markdown: string | null | undefined): string {
  if (typeof window === "undefined") {
    console.warn("`markdownToSafeHTMLClient` should not be used on the server side.");
  }

  if (!markdown) return "";

  // Unescape legacy turndown escapes
  const unescaped = unescapeMarkdown(markdown);

  // Render markdown to HTML using markdown-it (with inline styles from renderer rules)
  const rendered = md.render(unescaped);

  // Sanitize the HTML to prevent XSS attacks using DOMPurify
  // Critical: Use hooks to preserve CSS properties that DOMPurify might filter
  // DOMPurify filters CSS properties automatically, but we need list-style-type and padding-left
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    // Preserve style attributes on ul, ol, li tags
    if (
      data.attrName === "style" &&
      (node.tagName === "UL" || node.tagName === "OL" || node.tagName === "LI")
    ) {
      data.keepAttr = true;
    }
  });

  const safeHTML = DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "code",
      "pre",
      "input",
      "blockquote",
      "hr",
      "s",
      "strike",
      "b",
      "i",
      "u",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "type", "checked", "disabled", "style", "value"],
    ADD_ATTR: ["style"], // Explicitly preserve style attributes
    KEEP_CONTENT: true,
    // Ensure style attributes are not forbidden
    FORBID_ATTR: [],
  });

  // Remove hook after sanitization to avoid affecting other uses
  DOMPurify.removeHook("uponSanitizeAttribute");

  return safeHTML;
}
