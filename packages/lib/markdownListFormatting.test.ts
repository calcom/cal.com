import { describe, expect, it } from "vitest";

import { applyListFormatting, mergeOrphanedNestedLists } from "./markdownListFormatting";

describe("mergeOrphanedNestedLists", () => {
  it("merges a sibling ul-only li into the preceding li", () => {
    const input = "<ol><li>Details</li><li><ul><li>Detail A</li></ul></li></ol>";
    const output = mergeOrphanedNestedLists(input);

    expect(output).toBe("<ol><li>Details<ul><li>Detail A</li></ul></li></ol>");
  });

  it("handles multi-level orphaned nested lists", () => {
    const input =
      "<ol><li>Level 1</li><li><ul><li>Level 2</li><li><ul><li>Level 3</li></ul></li></ul></li></ol>";
    const output = mergeOrphanedNestedLists(input);

    expect(output).toBe(
      "<ol><li>Level 1<ul><li>Level 2<ul><li>Level 3</li></ul></li></ul></li></ol>"
    );
  });

  it("preserves inline emphasis inside the parent li", () => {
    const input = "<ol><li><strong>Important</strong> details</li><li><ul><li>Sub A</li></ul></li></ol>";
    const output = mergeOrphanedNestedLists(input);

    expect(output).toBe(
      "<ol><li><strong>Important</strong> details<ul><li>Sub A</li></ul></li></ol>"
    );
  });

  it("merges multiple consecutive orphan ul-only li siblings into one parent li", () => {
    const input =
      "<ol><li>A</li><li><ul><li>X</li></ul></li><li><ul><li>Y</li></ul></li></ol>";
    const output = mergeOrphanedNestedLists(input);

    expect(output).toBe("<ol><li>A<ul><li>X</li></ul><ul><li>Y</li></ul></li></ol>");
  });
});

describe("applyListFormatting", () => {
  it("applies list styles to tags with existing attributes", () => {
    const input = '<ol start="2"><li class="item">Item</li></ol>';
    const output = applyListFormatting(input);

    expect(output).toContain('start="2"');
    expect(output).toContain("list-style-type: decimal");
    expect(output).toMatch(/<li[^>]*class="item"[^>]*style='display: list-item'[^>]*>Item<\/li>/);
  });
});
