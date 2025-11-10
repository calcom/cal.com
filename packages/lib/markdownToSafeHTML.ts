import type { Attributes } from "sanitize-html";
import sanitizeHtml from "sanitize-html";

// --- HELPER FUNCTION ---
// We only need one copy of this function, as it's identical for both client and server.
function processInlineFormatting(text: string): string {
  if (!text) return "";

  // Escape HTML entities FIRST to prevent XSS in content
  let processed = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Process inline code FIRST (to protect content inside)
  const codeBlocks: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `___CODE_${codeBlocks.length}___`;
    // Escape HTML inside code
    const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codeBlocks.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // Links [text](url) - process before bold/italic
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Unescape the URL and link text
    const cleanUrl = url.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const cleanText = linkText.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanText}</a>`;
  });

  // Bold (**text**)
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic (__text__)
  processed = processed.replace(/__(.+?)__/g, "<em>$1</em>");

  // Italic (*text* or _text_) - must be careful not to conflict with bold
  processed = processed.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  processed = processed.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  // Strikethrough (~~text~~)
  processed = processed.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Restore code blocks
  codeBlocks.forEach((code, i) => {
    processed = processed.replace(`___CODE_${i}___`, code);
  });

  return processed;
}

// --- SHARED STYLING ---
// Define styles in one place
const STYLES = {
  text: "color: #101010; font-weight: 400; line-height: 24px; margin: 8px 0;",
  list: "list-style-position: inside; margin-left: 12px; margin-bottom: 4px; color: #101010; line-height: 24px;",
  listItem: "color: #101010; font-weight: 400; line-height: 24px; margin: 4px 0;",
  header: "color: #101010; font-weight: 600; line-height: 1.4; margin: 16px 0 8px 0;",
  h1: "font-size: 2em;",
  h2: "font-size: 1.5em;",
  h3: "font-size: 1.25em;",
  h4: "font-size: 1.1em;",
  h5: "font-size: 1em;",
  h6: "font-size: 0.9em;",
};

// --- SHARED PARSER ---
// The core logic that converts markdown string to raw HTML string.
function parseMarkdown(markdown: string | null): string {
  if (!markdown || typeof markdown !== "string") return "";

  // Handle <br> tags - convert to newlines FIRST
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

  // Remove escape backslashes. This is for legacy data, but be aware:
  // this means users *cannot* escape markdown (e.g., "\# header" will become a header).
  // For a more robust parser, escaping should be handled line-by-line.
  markdown = markdown
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
    .replace(/\\>/g, ">")
    .replace(/\\\./g, ".");

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let currentListItems: string[] = [];
  let currentListType: "ul" | "ol" | "task" | null = null;

  function closeList() {
    if (currentListItems.length > 0 && currentListType) {
      const tag = currentListType === "ol" ? "ol" : "ul";
      result.push(`<${tag}>${currentListItems.join("")}</${tag}>`);
      currentListItems = [];
      currentListType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        const code = codeBlockLines.join("\n");
        // Escape HTML entities inside the code block
        const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        result.push(`<pre><code>${escaped}</code></pre>`);
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        // Start code block
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty line - close list
    if (trimmed === "") {
      closeList();
      result.push(""); // Add an empty line to preserve spacing, will be handled by sanitizer
      continue;
    }

    // Headers (# ## ### etc.)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/) || trimmed.match(/^(#{1,6})$/);
    if (headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      const content = headerMatch[2] ? processInlineFormatting(headerMatch[2]) : "";
      result.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Horizontal rules
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      closeList();
      result.push("<hr>");
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith("> ")) {
      closeList();
      // Handle multi-line blockquotes (simple version)
      const content = processInlineFormatting(trimmed.substring(2));
      result.push(`<blockquote>${content}</blockquote>`);
      continue;
    }

    // Task lists (- [ ] or - [x])
    const taskMatch = trimmed.match(/^[-*•]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const content = processInlineFormatting(taskMatch[2]);
      const checkbox = `<input type="checkbox" disabled${checked ? " checked" : ""} />`;

      if (currentListType !== "task") {
        closeList();
        currentListType = "task";
      }
      currentListItems.push(`<li>${checkbox} ${content}</li>`);
      continue;
    }

    // Unordered lists (- or * or •)
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      const content = processInlineFormatting(ulMatch[1]);

      if (currentListType !== "ul") {
        closeList();
        currentListType = "ul";
      }
      currentListItems.push(`<li>${content}</li>`);
      continue;
    }

    // Ordered lists (1. 2. etc.)
    // Fixed: Removed the redundant/buggy check for escaped periods.
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const content = processInlineFormatting(olMatch[2] || "");
      const startValue = olMatch[1]; // Capture the number

      if (currentListType !== "ol") {
        closeList();
        currentListType = "ol";
      }
      // Add the "value" attribute to force the correct number
      currentListItems.push(`<li value="${startValue}">${content}</li>`);
      continue;
    }

    // Regular paragraph
    closeList();
    const processed = processInlineFormatting(trimmed);
    result.push(`<p>${processed}</p>`);
  }

  // Close any remaining list or code block
  closeList();
  if (inCodeBlock && codeBlockLines.length > 0) {
    const code = codeBlockLines.join("\n");
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    result.push(`<pre><code>${escaped}</code></pre>`);
  }

  return result.join("\n");
}

// --- SHARED STYLER ---
// Applies the inline styles to the raw HTML.
function applyStyling(html: string): string {
  return html
    .replace(/<p>/g, `<p style="${STYLES.text}">`)
    .replace(/<h1>/g, `<h1 style="${STYLES.header} ${STYLES.h1}">`)
    .replace(/<h2>/g, `<h2 style="${STYLES.header} ${STYLES.h2}">`)
    .replace(/<h3>/g, `<h3 style="${STYLES.header} ${STYLES.h3}">`)
    .replace(/<h4>/g, `<h4 style="${STYLES.header} ${STYLES.h4}">`)
    .replace(/<h5>/g, `<h5 style="${STYLES.header} ${STYLES.h5}">`)
    .replace(/<h6>/g, `<h6 style="${STYLES.header} ${STYLES.h6}">`)
    .replace(/<ul>/g, `<ul style="list-style-type: disc; ${STYLES.list}">`)
    .replace(/<ol>/g, `<ol style="list-style-type: decimal; ${STYLES.list}">`)
    .replace(/<li /g, `<li style="${STYLES.listItem}" `)
    .replace(/<li>/g, `<li style="${STYLES.listItem}">`);
}

// --- SERVER-SIDE FUNCTION ---
// Uses `sanitize-html` which is ideal for the backend.
export function markdownToSafeHTML(markdown: string | null) {
  if (typeof window !== "undefined") {
    console.warn("`markdownToSafeHTML` should not be imported on the client side.");
  }

  const rawHtml = parseMarkdown(markdown);
  const styledHtml = applyStyling(rawHtml);

  const safeHTML = sanitizeHtml(styledHtml, {
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
      "input",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      input: ["type", "checked", "disabled"],
      // Allow the style attribute on all tags
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
      ul: ["style"],
      ol: ["style"],
      li: ["style", "value"],
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
