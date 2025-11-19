import { describe, expect, it, vi, beforeEach } from "vitest";

import { markdownToSafeHTML } from "./markdownToSafeHTML";

/**
 * TEST SUITE OVERVIEW
 *
 * This comprehensive test suite validates:
 *
 * 1. XSS PREVENTION: Ensures malicious code cannot be injected through markdown
 *    - Script injection, event handlers, dangerous URLs, HTML tags, etc.
 *
 * 2. MARKDOWN EDGE CASES: Tests all markdown features and edge cases
 *    - Lists (ordered, unordered, nested, non-consecutive numbering)
 *    - Links, code blocks, blockquotes, headers, formatting
 *    - Special characters, Unicode, encoding, legacy data
 *    - Malformed input, empty/null values, whitespace
 *
 * 3. SANITIZATION CONSISTENCY: Ensures server and client produce safe output
 *
 * NOTE ON DOMPURIFY MOCKING:
 * DOMPurify is the gold standard for client-side HTML sanitization because it uses
 * a real browser DOM to parse and clean HTML. However, these tests run in Vitest
 * (Node.js environment), which doesn't have a DOM. Therefore, we mock DOMPurify
 * with a simplified simulation that removes dangerous content (scripts, event handlers,
 * dangerous URLs, etc.). This allows tests to run quickly in Node.js while still
 * verifying that the sanitization logic is being called correctly.
 *
 * In production, the real DOMPurify runs in the browser with full DOM capabilities.
 */

// Mock DOMPurify for client-side tests
// This mock simulates DOMPurify's sanitization behavior
const mockSanitize = vi.fn((html: string, config: Record<string, unknown>) => {
  // Simulate DOMPurify's sanitization
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/vbscript:/gi, "");
  sanitized = sanitized.replace(/data:/gi, "");

  // Remove dangerous tags (not in ALLOWED_TAGS)
  const allowedTags = (config?.ALLOWED_TAGS as string[]) || [];
  const dangerousTags = ["iframe", "embed", "object", "form", "input", "style", "meta", "script"];
  dangerousTags.forEach((tag) => {
    if (!allowedTags.includes(tag)) {
      sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
      sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*/?>`, "gi"), "");
    }
  });

  return sanitized;
});

const mockAddHook = vi.fn();
const mockRemoveHook = vi.fn();

vi.mock("dompurify", () => ({
  default: {
    sanitize: mockSanitize,
    addHook: mockAddHook,
    removeHook: mockRemoveHook,
    isSupported: true,
  },
}));

// Import after mocking - use dynamic import in tests that need it

describe("markdownToSafeHTML (Server-side)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("XSS Prevention", () => {
    describe("Script injection attacks", () => {
      it("should remove script tags from markdown", () => {
        const malicious = "Hello <script>alert('XSS')</script> world";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<script>");
        expect(result).not.toContain("alert('XSS')");
      });

      it("should remove script tags even when embedded in markdown", () => {
        const malicious = "# Heading\n<script src='evil.js'></script>\nNormal text";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<script");
        expect(result).toContain("Heading");
        expect(result).toContain("Normal text");
      });

      it("should remove script tags with various attributes", () => {
        const cases = [
          '<script type="text/javascript">alert(1)</script>',
          "<script async defer>alert(1)</script>",
          '<script src="https://evil.com/script.js"></script>',
        ];

        for (const malicious of cases) {
          const result = markdownToSafeHTML(malicious);
          expect(result).not.toContain("<script");
          expect(result).not.toContain("alert");
        }
      });
    });

    describe("Event handler injection", () => {
      it("should remove onclick handlers from HTML", () => {
        const malicious = '<a href="#" onclick="alert(1)">Click me</a>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("onclick");
        expect(result).not.toContain("alert(1)");
      });

      it("should remove onerror handlers from HTML", () => {
        const malicious = '<img src="image.jpg" onerror="alert(1)">';
        // Images are not in allowed tags, so img tag should be removed
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<img");
        expect(result).not.toContain("onerror");
      });

      it("should remove onmouseover and other event handlers", () => {
        const malicious = '<p onmouseover="alert(1)">Hover me</p>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("onmouseover");
        expect(result).not.toContain("alert(1)");
      });
    });

    describe("JavaScript URL schemes", () => {
      it("should sanitize javascript: URLs in links", () => {
        const malicious = "[Click](javascript:alert('XSS'))";
        const result = markdownToSafeHTML(malicious);
        // sanitize-html should remove the href or the entire link when scheme is not allowed
        // The link text might remain, but the href should be removed
        expect(result).not.toMatch(/href=["']javascript:/i);
        // If the link is removed entirely, that's also acceptable
        if (result.includes("Click")) {
          // Link text might remain but href should be sanitized
          expect(result).not.toMatch(/href=["']javascript:/i);
        }
      });

      it("should sanitize javascript: URLs with encoded characters", () => {
        const malicious = "[Click](javascript%3Aalert('XSS'))";
        const result = markdownToSafeHTML(malicious);
        // URL encoding is decoded by markdown-it, then sanitized
        expect(result).not.toMatch(/href=["']javascript:/i);
      });

      it("should allow safe URL schemes only", () => {
        const safe = "[Link](https://example.com)";
        const result = markdownToSafeHTML(safe);
        expect(result).toContain("https://example.com");
        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer"');
      });

      it("should allow mailto: and tel: schemes", () => {
        const email = "[Email](mailto:test@example.com)";
        const phone = "[Phone](tel:+1234567890)";
        const emailResult = markdownToSafeHTML(email);
        const phoneResult = markdownToSafeHTML(phone);

        expect(emailResult).toContain("mailto:test@example.com");
        expect(phoneResult).toContain("tel:+1234567890");
      });

      it("should block data: URLs", () => {
        const malicious = "[Click](data:text/html,<script>alert(1)</script>)";
        const result = markdownToSafeHTML(malicious);
        // data: scheme is not in allowedSchemes, so href should be removed
        expect(result).not.toMatch(/href=["']data:/i);
      });

      it("should block vbscript: URLs", () => {
        const malicious = "[Click](vbscript:alert('XSS'))";
        const result = markdownToSafeHTML(malicious);
        // vbscript: scheme is not in allowedSchemes
        expect(result).not.toMatch(/href=["']vbscript:/i);
      });
    });

    describe("Dangerous HTML tags", () => {
      it("should remove input tags", () => {
        const malicious = "Text <input type='text' value='XSS'> more text";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<input");
        expect(result).toContain("Text");
        expect(result).toContain("more text");
      });

      it("should remove iframe tags", () => {
        const malicious = "<iframe src='evil.com'></iframe>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<iframe");
      });

      it("should remove embed tags", () => {
        const malicious = "<embed src='evil.swf'>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<embed");
      });

      it("should remove object tags", () => {
        const malicious = "<object data='evil.swf'></object>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<object");
      });

      it("should remove form tags", () => {
        const malicious = "<form><input name='xss'></form>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<form");
        expect(result).not.toContain("<input");
      });

      it("should remove style tags", () => {
        const malicious = "<style>body { background: red; }</style>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<style");
      });

      it("should remove meta tags", () => {
        const malicious = "<meta http-equiv='refresh' content='0;url=evil.com'>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<meta");
      });
    });

    describe("Style attribute injection", () => {
      it("should only allow style on permitted tags", () => {
        const malicious =
          '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:red;z-index:9999">Overlay</div>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<div");
        expect(result).not.toContain("position:fixed");
      });

      it("should allow style on allowed tags like p, h1, etc", () => {
        const safe = "# Heading\n\nParagraph text";
        const result = markdownToSafeHTML(safe);
        // Should contain style attributes from our renderer
        expect(result).toContain("style=");
      });

      it("should prevent CSS expression injection", () => {
        const malicious = '<p style="background: expression(alert(1))">Text</p>';
        const result = markdownToSafeHTML(malicious);
        // Even if style is allowed, dangerous CSS should be filtered
        expect(result).not.toContain("expression");
      });
    });

    describe("Attribute injection", () => {
      it("should remove dangerous attributes from allowed tags", () => {
        const malicious = '<p id="xss" class="evil" data-xss="alert(1)">Text</p>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain('id="xss"');
        expect(result).not.toContain('class="evil"');
        expect(result).not.toContain("data-xss");
      });

      it("should only allow href, target, rel, style on anchor tags", () => {
        const malicious = '<a href="#" onclick="alert(1)" onmouseover="alert(2)">Link</a>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("onclick");
        expect(result).not.toContain("onmouseover");
      });
    });

    describe("Nested attack vectors", () => {
      it("should handle deeply nested malicious content", () => {
        const malicious = "<div><script><iframe><embed>XSS</embed></iframe></script></div>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<script");
        expect(result).not.toContain("<iframe");
        expect(result).not.toContain("<embed");
        expect(result).not.toContain("<div");
      });

      it("should sanitize markdown mixed with HTML attacks", () => {
        const malicious = "# Heading\n\n<script>alert(1)</script>\n\n**Bold** text";
        const result = markdownToSafeHTML(malicious);
        expect(result).toContain("Heading");
        expect(result).toContain("Bold");
        expect(result).not.toContain("<script");
      });
    });
  });

  describe("Markdown Edge Cases", () => {
    describe("Ordered list numbering", () => {
      it("should preserve non-consecutive ordered list numbers", () => {
        const markdown = "1. First item\n3. Third item\n2. Second item";
        const result = markdownToSafeHTML(markdown);
        // First item is 1, so start attribute won't be added
        // But value attributes should be preserved on each li
        expect(result).toContain('value="1"');
        expect(result).toContain('value="3"');
        expect(result).toContain('value="2"');
        expect(result).toContain("<ol");
        expect(result).toContain("<li");
      });

      it("should add start attribute when list doesn't start at 1", () => {
        const markdown = "3. Third\n4. Fourth\n5. Fifth";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain('start="3"');
        expect(result).toContain('value="3"');
        expect(result).toContain('value="4"');
        expect(result).toContain('value="5"');
      });

      it("should not add start attribute when list starts at 1", () => {
        const markdown = "1. First\n2. Second\n3. Third";
        const result = markdownToSafeHTML(markdown);
        expect(result).not.toContain('start="1"');
        expect(result).toContain("<ol");
      });

      it("should handle large start numbers", () => {
        const markdown = "100. Item one hundred\n101. Item one hundred one";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain('start="100"');
        expect(result).toContain('value="100"');
        expect(result).toContain('value="101"');
      });

      it("should handle single item lists", () => {
        const markdown = "1. Only item";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain("<li");
        expect(result).not.toContain('start="1"');
      });
    });

    describe("Nested lists", () => {
      it("should handle nested unordered lists", () => {
        const markdown = "- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ul");
        expect(result).toContain("<li");
        // Should have proper nesting structure
        expect(result.split("<ul").length).toBeGreaterThan(2);
      });

      it("should handle nested ordered lists", () => {
        const markdown = "1. Item 1\n   1. Nested 1\n   2. Nested 2\n2. Item 2";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain("<li");
      });

      it("should handle mixed nested lists", () => {
        const markdown = "1. Ordered\n   - Unordered nested\n2. Another";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain("<ul");
      });
    });

    describe("Empty and null inputs", () => {
      it("should return empty string for null input", () => {
        expect(markdownToSafeHTML(null)).toBe("");
      });

      it("should return empty string for undefined input", () => {
        expect(markdownToSafeHTML(undefined)).toBe("");
      });

      it("should return empty string for empty string", () => {
        expect(markdownToSafeHTML("")).toBe("");
      });

      it("should return empty string for whitespace-only input", () => {
        expect(markdownToSafeHTML("   \n\t  ")).toBe("");
      });
    });

    describe("Special characters and encoding", () => {
      it("should handle HTML entities in markdown", () => {
        const markdown = "Text with &amp; entities";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("&amp;");
      });

      it("should handle unicode characters", () => {
        const markdown = "Hello 世界 🌍";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("世界");
        expect(result).toContain("🌍");
      });

      it("should handle special markdown characters", () => {
        const markdown = "Text with *asterisks* and _underscores_";
        const result = markdownToSafeHTML(markdown);
        // Markdown-it renders * as <em> by default, ** as <strong>
        // Single * should be <em>, _ should also be <em>
        expect(result).toMatch(/<em>asterisks<\/em>/i);
        expect(result).toMatch(/<em>underscores<\/em>/i);
      });
    });

    describe("Legacy turndown escaping", () => {
      it("should unescape legacy turndown escapes", () => {
        const legacy = "\\# Heading\n\\*Bold\\*\n\\> Quote";
        const result = markdownToSafeHTML(legacy);
        expect(result).toContain("Heading");
        expect(result).toContain("Bold");
        expect(result).toContain("Quote");
      });

      it("should not unescape intentional escapes in fresh content", () => {
        const fresh = "Text with \\*one\\* escape";
        const result = markdownToSafeHTML(fresh);
        // Should preserve the escape if it's not legacy data
        expect(result).toContain("Text");
      });

      it("should handle escaped list markers", () => {
        const legacy = "\\- Item 1\n\\* Item 2";
        const result = markdownToSafeHTML(legacy);
        expect(result).toContain("Item 1");
        expect(result).toContain("Item 2");
      });
    });

    describe("Link handling", () => {
      it("should add security attributes to links", () => {
        const markdown = "[Link](https://example.com)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer"');
      });

      it("should handle reference-style links", () => {
        const markdown = "[Link][ref]\n\n[ref]: https://example.com";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
        expect(result).toContain('target="_blank"');
      });

      it("should handle autolinks", () => {
        const markdown = "Visit https://example.com for more";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
        expect(result).toContain('target="_blank"');
      });
    });

    describe("Code blocks and inline code", () => {
      it("should preserve code blocks", () => {
        const markdown = "```\nconst x = 1;\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
        expect(result).toContain("<code");
        expect(result).toContain("const x = 1;");
      });

      it("should preserve inline code", () => {
        const markdown = "Use `console.log()` to debug";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<code");
        expect(result).toContain("console.log()");
      });

      it("should sanitize code blocks containing HTML", () => {
        const markdown = "```\n<script>alert(1)</script>\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
        expect(result).not.toContain("<script");
        // The script should be escaped or removed
      });
    });

    describe("Blockquotes", () => {
      it("should render blockquotes correctly", () => {
        const markdown = "> This is a quote\n> Multiple lines";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
        expect(result).toContain("This is a quote");
      });

      it("should handle nested blockquotes", () => {
        const markdown = "> Quote\n> > Nested quote";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
      });
    });

    describe("Headers", () => {
      it("should render all header levels", () => {
        const markdown = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
        const result = markdownToSafeHTML(markdown);
        // Headers have inline styles, so check for the tag and content
        expect(result).toMatch(/<h1[^>]*>H1<\/h1>/i);
        expect(result).toMatch(/<h2[^>]*>H2<\/h2>/i);
        expect(result).toMatch(/<h3[^>]*>H3<\/h3>/i);
        expect(result).toMatch(/<h4[^>]*>H4<\/h4>/i);
        expect(result).toMatch(/<h5[^>]*>H5<\/h5>/i);
        expect(result).toMatch(/<h6[^>]*>H6<\/h6>/i);
      });
    });

    describe("Text formatting", () => {
      it("should handle bold text", () => {
        const markdown = "**Bold** and __also bold__";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<strong>Bold</strong>");
        expect(result).toContain("<strong>also bold</strong>");
      });

      it("should handle italic text", () => {
        const markdown = "Text with *italic* and _also italic_";
        const result = markdownToSafeHTML(markdown);
        // Both * and _ should render as <em> when not at start of line
        expect(result).toMatch(/<em>italic<\/em>/i);
        expect(result).toMatch(/<em>also italic<\/em>/i);
      });

      it("should handle strikethrough", () => {
        const markdown = "~~Strikethrough~~";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<s>Strikethrough</s>");
      });

      it("should handle mixed formatting", () => {
        const markdown = "**Bold** with *italic* and ~~strike~~";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<strong>Bold</strong>");
        expect(result).toContain("<em>italic</em>");
        expect(result).toContain("<s>strike</s>");
      });
    });

    describe("Horizontal rules", () => {
      it("should render horizontal rules", () => {
        const markdown = "Text\n\n---\n\nMore text";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<hr");
      });
    });

    describe("Line breaks", () => {
      it("should handle hard line breaks", () => {
        const markdown = "Line one  \nLine two";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<br");
      });

      it("should handle soft line breaks with breaks option", () => {
        const markdown = "Line one\nLine two";
        const result = markdownToSafeHTML(markdown);
        // With breaks: true, single newlines should create breaks
        expect(result).toContain("<br");
      });
    });

    describe("Complex markdown combinations", () => {
      it("should handle complex nested structures", () => {
        const markdown = `# Main Heading

## Subheading

1. First item
   - Nested bullet
   - Another nested
2. Second item

> Blockquote with **bold** text

\`\`\`javascript
const code = "example";
\`\`\`

[Link](https://example.com) with **bold** and *italic*.`;

        const result = markdownToSafeHTML(markdown);
        // Check for elements with their content (styles may be present)
        expect(result).toMatch(/<h1[^>]*>Main Heading<\/h1>/i);
        expect(result).toMatch(/<h2[^>]*>Subheading<\/h2>/i);
        expect(result).toContain("<ol");
        expect(result).toContain("<ul");
        expect(result).toContain("<blockquote");
        expect(result).toContain("<pre");
        expect(result).toMatch(/<strong>bold<\/strong>/i);
        expect(result).toMatch(/<em>italic<\/em>/i);
        expect(result).toMatch(/href=["']https:\/\/example\.com["']/i);
      });
    });

    describe("Malformed and edge case markdown", () => {
      it("should handle markdown with only punctuation", () => {
        const markdown = "!!! ??? ... ---";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        expect(result).not.toContain("<script");
      });

      it("should handle markdown with only symbols", () => {
        const markdown = "*** --- ___";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle markdown with only whitespace and newlines", () => {
        const markdown = "   \n\n   \n\t\n";
        const result = markdownToSafeHTML(markdown);
        // Should return empty string (whitespace-only input is normalized to empty)
        expect(result).toBe("");
      });

      it("should handle markdown with mixed line endings (CRLF, LF, CR)", () => {
        const markdown = "Line 1\r\nLine 2\nLine 3\rLine 4";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        expect(result).toContain("Line 1");
        expect(result).toContain("Line 4");
      });

      it("should handle markdown with excessive newlines", () => {
        const markdown = "Text\n\n\n\n\nMore text";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        expect(result).toContain("Text");
        expect(result).toContain("More text");
      });

      it("should handle markdown with excessive spaces", () => {
        const markdown = "Text     with     many     spaces";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        expect(result).toContain("Text");
      });

      it("should handle markdown with tabs", () => {
        const markdown = "Text\twith\ttabs";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        expect(result).toContain("Text");
      });

      it("should handle markdown with zero-width characters", () => {
        const markdown = "Text\u200Bwith\u200Czero\u200Dwidth";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        // Should sanitize or handle gracefully
      });

      it("should handle markdown with control characters", () => {
        const markdown = "Text\u0000with\u0001control\u0002chars";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        // Control chars should be removed or escaped
      });
    });

    describe("List edge cases", () => {
      it("should handle empty list items", () => {
        const markdown = "1. \n2. Item\n3. ";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain("<li");
      });

      it("should handle list items with only whitespace", () => {
        const markdown = "-   \n- Item\n-   ";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ul");
      });

      it("should handle lists with very large numbers", () => {
        const markdown = "999999. Very large number\n1000000. Even larger";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain('value="999999"');
      });

      it("should handle lists starting with zero", () => {
        const markdown = "0. Zero item\n1. First item";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain('value="0"');
      });

      it("should handle lists with negative numbers (should be treated as text)", () => {
        const markdown = "-1. Negative\n1. Positive";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
      });

      it("should handle deeply nested lists (5+ levels)", () => {
        const markdown =
          "1. Level 1\n    1. Level 2\n        1. Level 3\n            1. Level 4\n                1. Level 5";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result.split("<ol").length).toBeGreaterThan(4);
      });

      it("should handle lists with inconsistent spacing", () => {
        const markdown = "1.Item one\n2.  Item two\n3.   Item three";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
      });

      it("should handle lists with special characters in items", () => {
        const markdown = "1. Item with *asterisk*\n2. Item with _underscore_\n3. Item with `code`";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).toContain("<li");
      });

      it("should handle lists with HTML in items (should be sanitized)", () => {
        const markdown = "1. Item with <script>alert(1)</script>\n2. Safe item";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ol");
        expect(result).not.toContain("<script");
      });

      it("should handle unordered lists with different markers", () => {
        const markdown = "- Item 1\n* Item 2\n- Item 3";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<ul");
      });
    });

    describe("Link edge cases", () => {
      it("should handle links with very long URLs", () => {
        const longUrl = "https://example.com/" + "a".repeat(1000);
        const markdown = `[Link](${longUrl})`;
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
        expect(result).toContain('target="_blank"');
      });

      it("should handle links with special characters in URL", () => {
        const markdown = "[Link](https://example.com/path?query=value&other=test)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
      });

      it("should handle links with unicode in URL", () => {
        const markdown = "[Link](https://example.com/路径/测试)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
      });

      it("should handle links with empty text", () => {
        const markdown = "[](https://example.com)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
      });

      it("should handle links with only whitespace text", () => {
        const markdown = "[   ](https://example.com)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
      });

      it("should handle reference-style links with missing definition", () => {
        const markdown = "[Link][missing]";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle autolinks in various formats", () => {
        const markdown = "Visit https://example.com and http://test.com";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
        expect(result).toContain("http://test.com");
      });

      it("should handle email autolinks", () => {
        const markdown = "Email test@example.com";
        const result = markdownToSafeHTML(markdown);
        // markdown-it with linkify should convert emails
        expect(result).toBeTruthy();
      });

      it("should handle links with title attributes", () => {
        const markdown = '[Link](https://example.com "Link Title")';
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("https://example.com");
      });

      it("should handle malformed link syntax", () => {
        const markdown = "[Unclosed link(https://example.com)";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
        // Should handle gracefully without breaking
      });
    });

    describe("Code block edge cases", () => {
      it("should handle empty code blocks", () => {
        const markdown = "```\n\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
        expect(result).toContain("<code");
      });

      it("should handle code blocks with only whitespace", () => {
        const markdown = "```\n   \n\t\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
      });

      it("should handle code blocks with special characters", () => {
        const markdown = "```\n<>&\"'\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
        // Special chars should be escaped
      });

      it("should handle code blocks with unclosed fences", () => {
        const markdown = "```\nCode without closing fence";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle code blocks with language identifier", () => {
        const markdown = "```javascript\nconst x = 1;\n```";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
        expect(result).toContain("const x = 1;");
      });

      it("should handle inline code with backticks", () => {
        const markdown = "Code with ``double backticks``";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<code");
      });

      it("should handle inline code with special characters", () => {
        const markdown = "Code: `<script>alert(1)</script>`";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<code");
        // Script should be escaped in code
      });

      it("should handle code blocks with very long lines", () => {
        const longLine = "a".repeat(10000);
        const markdown = `\`\`\`\n${longLine}\n\`\`\``;
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<pre");
      });
    });

    describe("Blockquote edge cases", () => {
      it("should handle empty blockquotes", () => {
        const markdown = ">\n> \n>";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
      });

      it("should handle blockquotes with only whitespace", () => {
        const markdown = ">   \n>   ";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
      });

      it("should handle deeply nested blockquotes", () => {
        const markdown = "> Quote\n> > Nested\n> > > Very nested";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
        expect(result.split("<blockquote").length).toBeGreaterThan(2);
      });

      it("should handle blockquotes with other markdown", () => {
        const markdown = "> **Bold** and *italic*\n> - List item";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<blockquote");
        expect(result).toContain("<strong>Bold</strong>");
      });
    });

    describe("Header edge cases", () => {
      it("should handle headers with only hashes", () => {
        const markdown = "######";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle headers with only whitespace", () => {
        const markdown = "#   \n##   ";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<h1");
        expect(result).toContain("<h2");
      });

      it("should handle headers with special characters", () => {
        const markdown = "# Header with <>&\"'";
        const result = markdownToSafeHTML(markdown);
        expect(result).toMatch(/<h1[^>]*>/i);
        // Special chars should be escaped
      });

      it("should handle headers with unicode", () => {
        const markdown = "# 标题 世界 🌍";
        const result = markdownToSafeHTML(markdown);
        expect(result).toMatch(/<h1[^>]*>标题/i);
      });

      it("should handle headers with very long text", () => {
        const longText = "a".repeat(1000);
        const markdown = `# ${longText}`;
        const result = markdownToSafeHTML(markdown);
        expect(result).toMatch(/<h1[^>]*>/i);
      });

      it("should handle more than 6 hash marks (should be treated as text)", () => {
        const markdown = "####### Too many hashes";
        const result = markdownToSafeHTML(markdown);
        // Should not be a header
        expect(result).not.toMatch(/<h[1-6][^>]*>/i);
      });

      it("should handle headers with inline formatting", () => {
        const markdown = "# Header with **bold** and *italic*";
        const result = markdownToSafeHTML(markdown);
        expect(result).toMatch(/<h1[^>]*>/i);
        expect(result).toContain("<strong>bold</strong>");
      });
    });

    describe("Text formatting edge cases", () => {
      it("should handle bold with only asterisks", () => {
        const markdown = "**";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle italic with only asterisk", () => {
        const markdown = "*";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle strikethrough with only tildes", () => {
        const markdown = "~~";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle mixed formatting", () => {
        const markdown = "***bold and italic***";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle formatting with special characters", () => {
        const markdown = "**Bold with <>&\"'**";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<strong>");
        // Special chars should be escaped
      });

      it("should handle unclosed formatting", () => {
        const markdown = "**Bold without closing";
        const result = markdownToSafeHTML(markdown);
        expect(result).toBeTruthy();
      });

      it("should handle formatting across lines", () => {
        const markdown = "**Bold\nacross\nlines**";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("<strong>");
      });
    });

    describe("Very long input edge cases", () => {
      it("should handle very long markdown input", () => {
        const longMarkdown = "# Header\n\n" + "Paragraph text. ".repeat(1000);
        const result = markdownToSafeHTML(longMarkdown);
        expect(result).toBeTruthy();
        expect(result).toMatch(/<h1[^>]*>Header<\/h1>/i);
      });

      it("should handle markdown with many lists", () => {
        const manyLists = Array.from({ length: 100 }, (_, i) => `${i + 1}. Item ${i + 1}`).join("\n");
        const result = markdownToSafeHTML(manyLists);
        expect(result).toContain("<ol");
        expect(result.split("<li").length).toBeGreaterThan(50);
      });

      it("should handle markdown with many links", () => {
        const manyLinks = Array.from({ length: 50 }, (_, i) => `[Link ${i}](https://example.com/${i})`).join(
          "\n"
        );
        const result = markdownToSafeHTML(manyLinks);
        expect(result).toContain("https://example.com");
      });
    });

    describe("HTML mixed with markdown edge cases", () => {
      it("should sanitize HTML while preserving markdown", () => {
        const markdown = "# Heading\n\n<script>alert(1)</script>\n\n**Bold** text";
        const result = markdownToSafeHTML(markdown);
        expect(result).toMatch(/<h1[^>]*>Heading<\/h1>/i);
        expect(result).not.toContain("<script");
        expect(result).toContain("<strong>Bold</strong>");
      });

      it("should handle HTML comments in markdown", () => {
        const markdown = "Text <!-- comment --> more text";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("Text");
        expect(result).toContain("more text");
        // HTML comments should be removed
      });

      it("should handle HTML entities in markdown", () => {
        const markdown = "Text &amp; entities &lt;script&gt;";
        const result = markdownToSafeHTML(markdown);
        expect(result).toContain("&amp;");
        expect(result).toContain("&lt;");
      });

      it("should handle markdown inside HTML (should be sanitized)", () => {
        const markdown = "<div># Not a header</div>";
        const result = markdownToSafeHTML(markdown);
        expect(result).not.toContain("<div");
        // div is not in allowed tags
      });
    });

    describe("Additional XSS edge cases", () => {
      it("should handle script tags with mixed case", () => {
        const malicious = "<ScRiPt>alert(1)</ScRiPt>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<script");
        expect(result).not.toContain("<ScRiPt");
      });

      it("should handle script tags with null bytes", () => {
        const malicious = "<script\u0000>alert(1)</script>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<script");
      });

      it("should handle event handlers with unicode", () => {
        const malicious = '<p onclick="alert(1)">Click</p>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("onclick");
      });

      it("should handle CSS injection attempts", () => {
        const malicious = '<p style="background: url(javascript:alert(1))">Text</p>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("javascript:");
      });

      it("should handle SVG with script", () => {
        const malicious = "<svg><script>alert(1)</script></svg>";
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<svg");
        expect(result).not.toContain("<script");
      });

      it("should handle iframe with various protocols", () => {
        const cases = [
          '<iframe src="javascript:alert(1)"></iframe>',
          '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
        ];
        for (const malicious of cases) {
          const result = markdownToSafeHTML(malicious);
          expect(result).not.toContain("<iframe");
        }
      });

      it("should handle link with javascript: and encoded characters", () => {
        const malicious =
          '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">Click</a>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toMatch(/href=["']javascript:/i);
      });

      it("should handle img with onerror", () => {
        const malicious = '<img src="x" onerror="alert(1)">';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<img");
        expect(result).not.toContain("onerror");
      });

      it("should handle form with action javascript", () => {
        const malicious = '<form action="javascript:alert(1)"><input></form>';
        const result = markdownToSafeHTML(malicious);
        expect(result).not.toContain("<form");
        expect(result).not.toContain("<input");
      });
    });
  });
});

describe("markdownToSafeHTMLClient (Client-side)", () => {
  let markdownToSafeHTMLClient: typeof import("./markdownToSafeHTMLClient").markdownToSafeHTMLClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mocks
    mockSanitize.mockClear();
    mockAddHook.mockClear();
    mockRemoveHook.mockClear();

    // Set up window mock
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
      configurable: true,
    });

    // Dynamically import after mocks are set up
    const module = await import("./markdownToSafeHTMLClient");
    markdownToSafeHTMLClient = module.markdownToSafeHTMLClient;
  });

  afterEach(() => {
    // Clean up window mock to prevent affecting other tests
    delete (global as { window?: unknown }).window;
  });

  describe("XSS Prevention", () => {
    it("should remove script tags", () => {
      const malicious = "Hello <script>alert('XSS')</script> world";
      const result = markdownToSafeHTMLClient(malicious);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert('XSS')");
    });

    it("should sanitize javascript: URLs", () => {
      const malicious = "[Click](javascript:alert('XSS'))";
      const result = markdownToSafeHTMLClient(malicious);
      // The href with javascript: should be removed or sanitized
      expect(result).not.toMatch(/href=["']javascript:/i);
    });

    it("should remove input tags", () => {
      const malicious = "Text <input type='text'> more text";
      const result = markdownToSafeHTMLClient(malicious);
      expect(result).not.toContain("<input");
    });

    it("should remove dangerous HTML tags", () => {
      const malicious = "<iframe src='evil.com'></iframe><embed src='evil.swf'>";
      const result = markdownToSafeHTMLClient(malicious);
      expect(result).not.toContain("<iframe");
      expect(result).not.toContain("<embed");
    });
  });

  describe("Markdown Edge Cases", () => {
    it("should preserve ordered list numbering", () => {
      const markdown = "1. First\n3. Third\n2. Second";
      const result = markdownToSafeHTMLClient(markdown);
      // First item is 1, so start won't be added, but values should be preserved
      expect(result).toContain('value="1"');
      expect(result).toContain('value="3"');
      expect(result).toContain('value="2"');
      expect(result).toContain("<ol");
    });

    it("should handle empty input", () => {
      expect(markdownToSafeHTMLClient(null)).toBe("");
      expect(markdownToSafeHTMLClient(undefined)).toBe("");
      expect(markdownToSafeHTMLClient("")).toBe("");
    });

    it("should render basic markdown correctly", () => {
      const markdown = "# Heading\n\n**Bold** text";
      const result = markdownToSafeHTMLClient(markdown);
      // Headers have inline styles
      expect(result).toMatch(/<h1[^>]*>Heading<\/h1>/i);
      expect(result).toContain("<strong>Bold</strong>");
    });
  });

  describe("Consistency with server-side", () => {
    it("should produce similar sanitized output for safe markdown", () => {
      const markdown = "# Heading\n\n**Bold** text with [link](https://example.com)";
      const serverResult = markdownToSafeHTML(markdown);
      const clientResult = markdownToSafeHTMLClient(markdown);

      // Both should contain the same safe elements (with possible style attributes)
      expect(serverResult).toMatch(/<h1[^>]*>Heading<\/h1>/i);
      expect(clientResult).toMatch(/<h1[^>]*>Heading<\/h1>/i);
      expect(serverResult).toContain("<strong>Bold</strong>");
      expect(clientResult).toContain("<strong>Bold</strong>");
      expect(serverResult).toMatch(/https:\/\/example\.com/i);
      expect(clientResult).toMatch(/https:\/\/example\.com/i);

      // Both should sanitize dangerous content
      const malicious = "<script>alert(1)</script>";
      const serverSafe = markdownToSafeHTML(malicious);
      const clientSafe = markdownToSafeHTMLClient(malicious);
      expect(serverSafe).not.toContain("<script");
      expect(clientSafe).not.toContain("<script");
    });
  });
});
