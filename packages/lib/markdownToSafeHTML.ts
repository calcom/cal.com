import type { Attributes } from "sanitize-html";
import sanitizeHtml from "sanitize-html";

import { md, unescapeMarkdown } from "./markdownIt";

/**
 * Converts markdown to safe HTML with inline styles for email compatibility
 * Uses the centralized markdown-it instance from @calcom/lib/markdownIt
 *
 * ⚠️ SECURITY: This function sanitizes the output using sanitize-html to prevent XSS attacks.
 * The underlying markdown-it instance has `html: true` enabled, which would be dangerous
 * without this sanitization step.
 *
 * @param markdown - The markdown string to convert
 * @returns Safe HTML string with inline styles (sanitized to prevent XSS)
 */
export function markdownToSafeHTML(markdown: string | null | undefined): string {
  if (typeof window !== "undefined") {
    console.warn("`markdownToSafeHTML` should not be imported on the client side.");
  }

  if (!markdown) return "";

  // Unescape legacy turndown escapes
  const unescaped = unescapeMarkdown(markdown);

  // Render markdown to HTML using markdown-it (with inline styles from renderer rules)
  const rendered = md.render(unescaped);

  // Sanitize the HTML to prevent XSS attacks
  const safeHTML = sanitizeHtml(rendered, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "s",
      "strike",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "pre",
      "code",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "style"],
      // Allow style attribute on specific tags that need inline styles
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
      ul: ["style"],
      ol: ["style", "start"],
      li: ["style", "value"],
      blockquote: ["style"],
      pre: ["style"],
      code: ["style"],
    },
    allowedStyles: {
      "*": {
        // Allow all styles used in the STYLES object from markdownIt.ts
        color: [/.*/],
        "font-weight": [/.*/],
        "line-height": [/.*/],
        margin: [/.*/],
        "margin-left": [/.*/],
        "margin-bottom": [/.*/],
        "font-size": [/.*/],
        "list-style-position": [/.*/],
        "list-style-type": [/.*/],
        padding: [/.*/],
        "padding-left": [/.*/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName: string, attribs: Attributes) => {
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            rel: "noopener noreferrer",
            target: "_blank",
          },
        };
      },
    },
  });

  return safeHTML;
}
