import DOMPurify from "dompurify";

import { md, unescapeMarkdown } from "./markdownIt";

/**
 * Converts markdown to safe HTML with inline styles for client-side use
 * Uses the centralized markdown-it instance from @calcom/lib/markdownIt
 *
 * ⚠️ SECURITY: This function sanitizes the output using DOMPurify to prevent XSS attacks.
 * The underlying markdown-it instance has `html: true` enabled, which would be dangerous
 * without this sanitization step.
 *
 * @param markdown - The markdown string to convert
 * @returns Safe HTML string with inline styles (sanitized to prevent XSS)
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
  // DOMPurify filters CSS properties automatically; preserve allowed styles/attributes
  const STYLE_ALLOWED_TAGS = new Set([
    "A",
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
  ]);

  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "style" && STYLE_ALLOWED_TAGS.has(node.tagName)) {
      data.keepAttr = true;
      return;
    }

    if (data.attrName === "value" && node.tagName === "LI") {
      data.keepAttr = true;
      return;
    }

    if (data.attrName === "start" && node.tagName === "OL") {
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
      "blockquote",
      "hr",
      "s",
      "strike",
      "b",
      "i",
      "u",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ADD_ATTR: ["style", "value", "start"], // Explicitly preserve supported attributes
    KEEP_CONTENT: true,
    // Ensure style attributes are not forbidden
    FORBID_ATTR: [],
  });

  // Remove hook after sanitization to avoid affecting other uses
  DOMPurify.removeHook("uponSanitizeAttribute");

  return safeHTML;
}
