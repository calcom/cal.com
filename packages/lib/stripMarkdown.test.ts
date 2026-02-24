import { describe, expect, it, vi } from "vitest";

vi.mock("remove-markdown", () => ({
  default: (s: string) =>
    s
      .replace(/#{1,6}\s?/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .trim(),
}));

import { stripMarkdown } from "./stripMarkdown";

describe("stripMarkdown", () => {
  it("strips heading markers", () => {
    expect(stripMarkdown("# Hello")).toBe("Hello");
    expect(stripMarkdown("## Subheading")).toBe("Subheading");
  });

  it("strips bold markers", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text");
  });

  it("strips link syntax keeping text", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe("click here");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("use `console.log`")).toBe("use");
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripMarkdown("plain text")).toBe("plain text");
  });
});
