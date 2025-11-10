import type { Attributes } from "sanitize-html";
import sanitizeHtml from "sanitize-html";

// --- HELPER FUNCTION ---
// We only need one copy of this function, as it's identical for both client and server.
function processInlineFormatting(text: string): string {
  if (!text) return "";

  let processed = text;

  // Step 1: Process inline code FIRST (to protect content inside)
  const codeBlocks: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `___CODE_${codeBlocks.length}___`;
    // Escape HTML inside the raw code content
    const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codeBlocks.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // Step 2: Escape the rest of the HTML entities to prevent XSS
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Links [text](url) - process before bold/italic
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // The linkText and url are already escaped from the previous step.
    // We don't un-escape them, to avoid re-introducing vulnerabilities.
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // Bold (**text**)
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Bold (__text__)
  processed = processed.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_) - must be careful not to conflict with bold
  processed = processed.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  processed = processed.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  // Strikethrough (~~text~~)
  processed = processed.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Step 3: Restore code blocks
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
  const listStack: { type: "ul" | "ol" | "task"; indent: number; loose?: boolean }[] = [];
  let consecutiveBlankLines = 0;

  function getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  function closeList(indent: number) {
    while (listStack.length > 0 && indent <= listStack[listStack.length - 1].indent) {
      const list = listStack.pop();
      if (list) {
        const tag = list.type === "ol" ? "ol" : "ul";
        result.push(`${" ".repeat(list.indent)}</${tag}>`);
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      consecutiveBlankLines = 0;
      closeList(-1); // Close all lists
      if (inCodeBlock) {
        const code = codeBlockLines.join("\n");
        const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        result.push(`<pre><code>${escaped}</code></pre>`);
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headers, HR, Blockquotes are not indented
    if (indent === 0) {
      closeList(-1);
      if (trimmed === "") {
        result.push("");
        continue;
      }
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/) || trimmed.match(/^(#{1,6})$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2] ? processInlineFormatting(headerMatch[2]) : "";
        result.push(`<h${level}>${content}</h${level}>`);
        continue;
      }
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        result.push("<hr>");
        continue;
      }
      if (trimmed.startsWith("> ")) {
        const content = processInlineFormatting(trimmed.substring(2));
        result.push(`<blockquote>${content}</blockquote>`);
        continue;
      }
    }

    const taskMatch = trimmed.match(/^[-*•]\s+\[([ xX])\]\s+(.+)$/);
    const ulMatch = !taskMatch && trimmed.match(/^[-*•]\s+(.+)$/);
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (taskMatch || ulMatch || olMatch) {
      consecutiveBlankLines = 0;
      const listType = taskMatch ? "task" : ulMatch ? "ul" : "ol";
      const currentIndent = listStack.length > 0 ? listStack[listStack.length - 1].indent : -1;
      const currentType = listStack.length > 0 ? listStack[listStack.length - 1].type : null;

      if (indent > currentIndent) {
        // Start a new nested list
        listStack.push({ type: listType, indent });
        const tag = listType === "ol" ? "ol" : "ul";
        result.push(`${" ".repeat(indent)}<${tag}>`);
      } else if (indent < currentIndent) {
        // Close nested lists
        closeList(indent);
        // Check if we need to start a new list of the same type
        if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent) {
          listStack.push({ type: listType, indent });
          const tag = listType === "ol" ? "ol" : "ul";
          result.push(`${" ".repeat(indent)}<${tag}>`);
        }
      } else if (listType !== currentType) {
        // Same indent, but different list type
        closeList(indent);
        listStack.push({ type: listType, indent });
        const tag = listType === "ol" ? "ol" : "ul";
        result.push(`${" ".repeat(indent)}<${tag}>`);
      }

      let content = "";
      let startValue = "";
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === "x";
        content = processInlineFormatting(taskMatch[2]);
        const checkbox = `<input type="checkbox" disabled${checked ? " checked" : ""} />`;
        content = `${checkbox} ${content}`;
      } else if (ulMatch) {
        content = processInlineFormatting(ulMatch[1]);
      } else if (olMatch) {
        content = processInlineFormatting(olMatch[2] || "");
        startValue = olMatch[1];
      }
      const isLoose = listStack.length > 0 && listStack[listStack.length - 1].loose;
      const liTag = startValue ? `<li value="${startValue}">` : `<li>`;
      result.push(`${" ".repeat(indent + 2)}${liTag}${isLoose ? `<p>${content}</p>` : content}</li>`);
    } else if (trimmed !== "") {
      consecutiveBlankLines = 0;
      closeList(-1);
      const processed = processInlineFormatting(trimmed);
      result.push(`<p>${processed}</p>`);
    } else {
      consecutiveBlankLines++;
      if (listStack.length > 0) {
        if (consecutiveBlankLines === 1) {
          const currentList = listStack[listStack.length - 1];
          if (!currentList.loose) {
            currentList.loose = true;
            for (let j = result.length - 1; j >= 0; j--) {
              const res = result[j];
              const itemIndent = getIndent(res);
              if (itemIndent > currentList.indent) {
                if (res.trim().startsWith("<li")) {
                  result[j] = res.replace(/<li>(.*)<\/li>/, "<li><p>$1</p></li>");
                }
              } else if (itemIndent <= currentList.indent) {
                break;
              }
            }
          }
          result.push("");
        } else {
          closeList(-1);
          result.push("");
        }
      } else {
        closeList(-1);
        result.push("");
      }
    }
  }

  // Close any remaining lists or code blocks
  closeList(-1);
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
    allowedStyles: {
      "*": {
        // Allow all styles used in the STYLES object
        color: [/.*/],
        "font-weight": [/.*/],
        "line-height": [/.*/],
        margin: [/.*/],
        "margin-left": [/.*/],
        "margin-bottom": [/.*/],
        "font-size": [/.*/],
        "list-style-position": [/.*/],
        "list-style-type": [/.*/],
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
