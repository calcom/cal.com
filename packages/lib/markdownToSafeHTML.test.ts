import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/markdownIt", () => {
  const MarkdownIt = require("markdown-it");
  return { md: new MarkdownIt() };
});

import { markdownToSafeHTML } from "./markdownToSafeHTML";

describe("markdownToSafeHTML", () => {
  it("returns empty string for null input", () => {
    expect(markdownToSafeHTML(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(markdownToSafeHTML("")).toBe("");
  });

  it("converts basic markdown to HTML", () => {
    const result = markdownToSafeHTML("Hello world");
    expect(result).toContain("Hello world");
  });

  it("sanitizes dangerous HTML (strips scripts)", () => {
    const result = markdownToSafeHTML('<script>alert("xss")</script>Hello');
    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("adds list-style-type to unordered lists", () => {
    const result = markdownToSafeHTML("- item1\n- item2");
    expect(result).toContain("list-style-type: disc");
  });

  it("adds list-style-type to ordered lists", () => {
    const result = markdownToSafeHTML("1. first\n2. second");
    expect(result).toContain("list-style-type: decimal");
  });

  it("adds target='_blank' and classes to links", () => {
    const result = markdownToSafeHTML("[Cal.com](https://cal.com)");
    expect(result).toContain("target='_blank'");
    expect(result).toContain("text-blue-500");
  });

  it("handles bold and italic markdown", () => {
    const result = markdownToSafeHTML("**bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("handles multiple paragraphs", () => {
    const result = markdownToSafeHTML("First paragraph\n\nSecond paragraph");
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });
});
