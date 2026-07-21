import { describe, expect, it } from "vitest";

import { mergeOrphanedNestedLists } from "./markdownListFormatting";

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
});
