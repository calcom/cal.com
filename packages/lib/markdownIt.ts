import MarkdownIt from "markdown-it";

/**
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 *
 * This markdown-it instance has `html: true` enabled, which means it will pass
 * raw HTML tags directly through to the output. This creates a MASSIVE XSS
 * (Cross-Site Scripting) vulnerability if the output is not sanitized.
 *
 * **NEVER use `md.render()` directly without sanitization!**
 *
 * Example of the vulnerability:
 *   Input:  "Hello <script>alert('XSS')</script>"
 *   Output: "<p>Hello</p> <script>alert('XSS')</script>"  ← Script executes!
 *
 * **ALWAYS use one of these safe wrapper functions instead:**
 *   - `markdownToSafeHTML()` - Server-side (uses sanitize-html)
 *   - `markdownToSafeHTMLClient()` - Client-side (uses DOMPurify)
 *
 * This file is a low-level configuration component. It should only be used
 * internally by the safe wrapper functions above.
 *
 * @see markdownToSafeHTML - Safe server-side markdown rendering
 * @see markdownToSafeHTMLClient - Safe client-side markdown rendering
 */
export const md = new MarkdownIt({ html: true, breaks: true, linkify: true });

/**
 * Style map for email compatibility
 * Inline styles are required because many email clients don't support external CSS
 */
const STYLES = {
  text: "font-weight: 400; line-height: 24px; margin: 8px 0;",
  list: "list-style-type: disc; list-style-position: outside; padding-left: 20px; margin-left: 1.5em; line-height: 24px;",
  orderedList:
    "list-style-type: decimal; list-style-position: outside; padding-left: 20px; margin-left: 1.5em; line-height: 24px;",
  listItem: "font-weight: 400; line-height: 24px; margin: 4px 0;",
  header: "font-weight: 600; line-height: 1.4; margin: 16px 0 8px 0;",
  h1: "font-size: 2em;",
  h2: "font-size: 1.5em;",
  h3: "font-size: 1.25em;",
  h4: "font-size: 1.1em;",
  h5: "font-size: 1em;",
  h6: "font-size: 0.9em;",
} as const;

type StyleKey = keyof typeof STYLES;

/**
 * Minimal Token interface matching what we use from markdown-it tokens
 */
interface Token {
  attrGet(name: string): string | null;
  attrSet(name: string, value: string): void;
  tag: string;
}

/**
 * Helper function to add style attribute to token
 */
function addStyle(token: Token, ...styles: StyleKey[]) {
  const styleStr = styles.map((key) => STYLES[key]).join(" ");
  const existingStyle = token.attrGet("style") || "";
  const newStyle = existingStyle ? `${existingStyle}; ${styleStr}` : styleStr;
  token.attrSet("style", newStyle);
}

// Store original renderer functions BEFORE overriding (to avoid infinite recursion)
const originalHeadingOpen = md.renderer.rules.heading_open;
const originalParagraphOpen = md.renderer.rules.paragraph_open;
const originalBulletListOpen = md.renderer.rules.bullet_list_open;
const originalOrderedListOpen = md.renderer.rules.ordered_list_open;
const originalListItemOpen = md.renderer.rules.list_item_open;
const originalLinkOpen = md.renderer.rules.link_open;

/**
 * Override heading renderer to add inline styles
 */
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const level = token.tag.match(/h(\d)/)?.[1];
  if (level && parseInt(level) <= 6) {
    addStyle(token, "header", `h${level}` as StyleKey);
  }
  return originalHeadingOpen
    ? originalHeadingOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Override paragraph renderer to add inline styles
 */
md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
  addStyle(tokens[idx], "text");
  return originalParagraphOpen
    ? originalParagraphOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Override bullet list renderer to add inline styles
 */
md.renderer.rules.bullet_list_open = (tokens, idx, options, env, self) => {
  addStyle(tokens[idx], "list");
  return originalBulletListOpen
    ? originalBulletListOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Override ordered list renderer to add inline styles
 */
md.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  addStyle(token, "orderedList");

  const nextToken = tokens[idx + 1];
  if (nextToken?.tag === "li") {
    const startValue = parseInt(nextToken.info || "", 10);
    if (!Number.isNaN(startValue) && startValue !== 1) {
      token.attrSet("start", String(startValue));
    }
  }
  return originalOrderedListOpen
    ? originalOrderedListOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Override list item renderer to add inline styles
 */
md.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  addStyle(token, "listItem");

  if (token.info) {
    token.attrSet("value", token.info);
  }
  return originalListItemOpen
    ? originalListItemOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Override link renderer to add security attributes and styles
 */
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token.attrSet("target", "_blank");
  token.attrSet("rel", "noopener noreferrer");
  return originalLinkOpen
    ? originalLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/**
 * Unescapes markdown characters that may have been escaped by turndown.
 * This handles legacy data where turndown escaped markdown syntax.
 * It also normalizes list markers to ensure they have proper spacing.
 *
 * Note: Only unescapes if input appears to be legacy data (has multiple escaped
 * markdown characters), to avoid corrupting fresh input with intentional escapes.
 */
export function unescapeMarkdown(markdown: string): string {
  if (!markdown) return "";

  // Detect if this is likely legacy data from Turndown
  // Look for patterns that suggest Turndown escaping:
  // - Escaped headers at start of line: \#header
  // - Escaped blockquotes: \> quote
  // - Multiple escaped formatting chars (2+ to catch cases like \*Important\*)
  const hasEscapedHeaders = /^\\#+\s/m.test(markdown);
  const hasEscapedBlockquotes = /^\\>\s/m.test(markdown);
  const escapedMarkdownChars = (markdown.match(/\\([*_`#[\]()~>-])/g) || []).length;
  // Only treat as legacy if we see clear Turndown patterns or 2+ escaped chars
  const isLikelyLegacyData = hasEscapedHeaders || hasEscapedBlockquotes || escapedMarkdownChars >= 3;

  let result = markdown;

  // Only unescape if it's likely legacy data to avoid corrupting intentional escapes
  if (isLikelyLegacyData) {
    // Unescape legacy backslashes for specific characters.
    result = result
      .replace(/\\([#`[\]()~>])/g, "$1")
      .replace(/\\_/g, "_")
      .replace(/\\\*/g, "*") // Specifically handle escaped asterisks
      .replace(/\\-/g, "-");
  }

  // For unordered lists: ensure a single leading `-` or `*` used as a bullet has a trailing space.
  // Only match at start of line (after optional whitespace) and ensure it's not part of emphasis
  // The negative character class avoids matching emphasis/bold like `**` or `--`.
  const unorderedListRegex = /^(\s*)([-*])([^\s*-])/gm;
  // For numbered lists: `  1.item` -> `  1. item`
  const orderedListRegex = /^(\s*\d+\.)(\S)/gm;

  result = result.replace(unorderedListRegex, "$1$2 $3").replace(orderedListRegex, "$1 $2");

  return result;
}
