import { describe, expect, test } from "bun:test";
import { normalizeMarkdown } from "../../utils/normalizeMarkdown";

describe("normalizeMarkdown", () => {
  test("returns empty string for empty input", () => {
    expect(normalizeMarkdown("")).toBe("");
  });

  test("removes HTML tags", () => {
    expect(normalizeMarkdown("<p>Hello</p>")).toBe("Hello");
    expect(normalizeMarkdown("<br>line<br>break")).toBe("line break");
    expect(normalizeMarkdown("<div>content</div>")).toBe("content");
  });

  test("converts HTML entities", () => {
    expect(normalizeMarkdown("&amp;")).toBe("&");
    expect(normalizeMarkdown("&lt;")).toBe("<");
    expect(normalizeMarkdown("&gt;")).toBe(">");
    expect(normalizeMarkdown("&quot;")).toBe('"');
    expect(normalizeMarkdown("&#39;")).toBe("'");
    expect(normalizeMarkdown("&nbsp;")).toBe("");
  });

  test("converts markdown links to text", () => {
    expect(normalizeMarkdown("[Click here](https://example.com)")).toBe("Click here");
  });

  test("removes bold markers", () => {
    expect(normalizeMarkdown("**bold text**")).toBe("bold text");
  });

  test("removes italic markers", () => {
    expect(normalizeMarkdown("*italic text*")).toBe("italic text");
  });

  test("removes inline code markers", () => {
    expect(normalizeMarkdown("`code`")).toBe("code");
  });

  test("removes strikethrough markers", () => {
    expect(normalizeMarkdown("~~strikethrough~~")).toBe("strikethrough");
  });

  test("removes heading markers", () => {
    expect(normalizeMarkdown("# Heading 1")).toBe("Heading 1");
    expect(normalizeMarkdown("## Heading 2")).toBe("Heading 2");
    expect(normalizeMarkdown("### Heading 3")).toBe("Heading 3");
  });

  test("removes blockquote markers", () => {
    expect(normalizeMarkdown("> quoted text")).toBe("quoted text");
  });

  test("removes list markers", () => {
    expect(normalizeMarkdown("- item")).toBe("item");
    expect(normalizeMarkdown("* item")).toBe("item");
    expect(normalizeMarkdown("+ item")).toBe("item");
  });

  test("removes numbered list markers", () => {
    expect(normalizeMarkdown("1. first item")).toBe("first item");
    expect(normalizeMarkdown("2. second item")).toBe("second item");
  });

  test("normalizes whitespace", () => {
    expect(normalizeMarkdown("hello   world")).toBe("hello world");
    expect(normalizeMarkdown("hello\n\nworld")).toBe("hello world");
  });

  test("trims whitespace", () => {
    expect(normalizeMarkdown("  hello  ")).toBe("hello");
  });
});
