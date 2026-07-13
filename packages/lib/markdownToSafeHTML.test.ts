import { describe, expect, it } from "vitest";

import { markdownToSafeHTML } from "./markdownToSafeHTML";

describe("markdownToSafeHTML", () => {
  it("renders ordered list followed by unordered list with both bullets formatted", () => {
    const markdown = `1. First step
2. Second step

- Bullet one
- Bullet two`;

    const html = markdownToSafeHTML(markdown);

    expect(html).toMatch(/<ol[^>]*>[\s\S]*?<\/ol>[\s\S]*?<ul[^>]*>/);
    expect(html).toMatch(
      /<ul[^>]*>[\s\S]*?<li[^>]*>\s*Bullet one[\s\S]*?<\/li>[\s\S]*?<li[^>]*>\s*Bullet two[\s\S]*?<\/li>[\s\S]*?<\/ul>/
    );
  });

  it("renders numbered list with trailing unordered sub-bullets inside the last item", () => {
    const markdown = `1. Overview
2. Details
   - Detail A
   - Detail B`;

    const html = markdownToSafeHTML(markdown);

    expect(html).toContain("Detail A");
    expect(html).toContain("Detail B");
    // Nested ul should not be a separate top-level list item sibling
    expect(html).not.toMatch(/<li[^>]*>\s*<ul[^>]*>[\s\S]*Detail A/);
  });

  it("renders nested sub-bullets when parent list item has inline emphasis", () => {
    const markdown = `1. **Important** details
   - Sub A
   - Sub B`;

    const html = markdownToSafeHTML(markdown);

    expect(html).toContain("Sub A");
    expect(html).toContain("Sub B");
    expect(html).not.toMatch(/<li[^>]*>\s*<ul[^>]*>[\s\S]*Sub A/);
  });

  it("renders mixed numbered list, paragraph, and trailing bullets", () => {
    const markdown = `1. Register
2. Confirm

What's included:
- Item A
- Item B`;

    const html = markdownToSafeHTML(markdown);

    expect(html).toContain("What's included:");
    expect(html).toContain("list-style-position: outside");
    expect(html).toMatch(
      /<ul[^>]*>[\s\S]*?<li[^>]*>\s*Item A[\s\S]*?<\/li>[\s\S]*?<li[^>]*>\s*Item B[\s\S]*?<\/li>[\s\S]*?<\/ul>/
    );
  });
});
