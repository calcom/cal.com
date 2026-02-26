// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/markdownIt", () => ({
  md: {
    render: (input: string) => input,
  },
}));

import { markdownToSafeHTMLClient } from "./markdownToSafeHTMLClient";

describe("markdownToSafeHTMLClient", () => {
  it("returns empty string for null input", () => {
    expect(markdownToSafeHTMLClient(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(markdownToSafeHTMLClient("")).toBe("");
  });

  it("renders input through md.render", () => {
    const result = markdownToSafeHTMLClient("hello world");
    expect(result).toContain("hello world");
  });

  it("adds list-style-type disc to <ul> elements", () => {
    const result = markdownToSafeHTMLClient("<ul><li>item</li></ul>");
    expect(result).toContain("list-style-type: disc");
  });

  it("adds list-style-type decimal to <ol> elements", () => {
    const result = markdownToSafeHTMLClient("<ol><li>item</li></ol>");
    expect(result).toContain("list-style-type: decimal");
  });

  it("adds target=_blank to links", () => {
    const result = markdownToSafeHTMLClient('<a href="https://example.com">link</a>');
    expect(result).toContain("target='_blank'");
  });

  it("adds blue color class to links", () => {
    const result = markdownToSafeHTMLClient('<a href="https://example.com">link</a>');
    expect(result).toContain("text-blue-500");
  });

  it("merges nested list items", () => {
    const input = "<li>Text </li><li><ul><li>nested</li></ul></li>";
    const result = markdownToSafeHTMLClient(input);
    expect(result).not.toContain("</li><li><ul");
  });

  it("preserves plain text content", () => {
    const result = markdownToSafeHTMLClient("just plain text");
    expect(result).toBe("just plain text");
  });

  it("handles bold text in HTML", () => {
    const result = markdownToSafeHTMLClient("<strong>bold</strong>");
    expect(result).toContain("bold");
  });

  it("sanitizes script tags via DOMPurify", () => {
    const result = markdownToSafeHTMLClient("<script>alert('xss')</script>");
    expect(result).not.toContain("<script>");
  });

  it("handles multiple ul elements", () => {
    const result = markdownToSafeHTMLClient("<ul><li>a</li></ul><ul><li>b</li></ul>");
    expect(result.match(/list-style-type: disc/g)?.length).toBe(2);
  });
});
