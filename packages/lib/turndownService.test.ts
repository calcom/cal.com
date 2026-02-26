// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import turndown from "./turndownService";

describe("turndown", () => {
  it("converts basic HTML paragraph to text", () => {
    const result = turndown("<p>Hello World</p>");
    expect(result).toBe("Hello World");
  });

  it("strips [<p><br></p>] sequences", () => {
    const result = turndown("<p>Text</p>[<p><br></p>]");
    expect(result).not.toContain("[<p><br></p>]");
  });

  it("returns empty string for '<p><br></p>' input", () => {
    const result = turndown("<p><br></p>");
    expect(result).toBe("");
  });

  it("converts bold tags to markdown", () => {
    const result = turndown("<p><strong>bold text</strong></p>");
    expect(result).toContain("**bold text**");
  });

  it("converts links to markdown", () => {
    const result = turndown('<p><a href="https://cal.com">Cal.com</a></p>');
    expect(result).toContain("[Cal.com](https://cal.com)");
  });

  it("strips <em> tags (ignoreEmphasized rule)", () => {
    const result = turndown("<p><em>emphasized text</em></p>");
    expect(result).toBe("emphasized text");
    expect(result).not.toContain("*");
  });

  it("handles nested HTML correctly", () => {
    const result = turndown("<div><p>Outer <strong>inner <em>deep</em></strong></p></div>");
    expect(result).toContain("**inner deep**");
  });

  it("handles empty string input", () => {
    const result = turndown("");
    expect(result).toBe("");
  });

  it("handles complex HTML with mixed elements", () => {
    const result = turndown('<p>Hello <strong>world</strong> and <a href="https://cal.com">link</a></p>');
    expect(result).toContain("**world**");
    expect(result).toContain("[link](https://cal.com)");
  });
});
