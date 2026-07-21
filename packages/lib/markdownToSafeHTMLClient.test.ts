import { describe, expect, it } from "vitest";

import { markdownToSafeHTMLClient } from "./markdownToSafeHTMLClient";

describe("markdownToSafeHTMLClient", () => {
  it("renders ordered list followed by unordered list with both bullets formatted", () => {
    const markdown = `1. First step
2. Second step

- Bullet one
- Bullet two`;

    const html = markdownToSafeHTMLClient(markdown);

    expect(html).toMatch(/<ol[^>]*>[\s\S]*?<\/ol>[\s\S]*?<ul[^>]*>/);
    expect(html).toContain("Bullet one");
    expect(html).toContain("Bullet two");
  });

  it("merges trailing sub-bullets into the parent numbered list item", () => {
    const markdown = `1. Overview
2. Details
   - Detail A
   - Detail B`;

    const html = markdownToSafeHTMLClient(markdown);

    expect(html).toContain("Detail A");
    expect(html).toContain("Detail B");
    expect(html).not.toMatch(/<li[^>]*>\s*<ul[^>]*>[\s\S]*Detail A/);
  });
});
