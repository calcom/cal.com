import { describe, expect, it } from "vitest";

import { markdownToSafeHTML } from "./markdownToSafeHTML";

describe("markdownToSafeHTML", () => {
  it("applies heading styles for large headings", () => {
    const html = markdownToSafeHTML("# Meeting details");

    expect(html).toContain("<h1 class='text-2xl font-semibold mb-2'>");
    expect(html).toContain("Meeting details");
  });

  it("applies heading styles for smaller heading levels", () => {
    const html = markdownToSafeHTML("## Agenda\n\n### Notes");

    expect(html).toContain("<h2 class='text-xl font-semibold mb-2'>");
    expect(html).toContain("<h3 class='text-lg font-semibold mb-1'>");
  });
});
