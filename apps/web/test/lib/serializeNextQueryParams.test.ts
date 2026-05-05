import { describe, expect, it } from "vitest";

import { serializeNextQueryParams } from "@calcom/web/lib/serializeNextQueryParams";

describe("serializeNextQueryParams", () => {
  it("preserves repeated query params instead of joining array values with commas", () => {
    expect(
      serializeNextQueryParams({
        user: ["john", "doe"],
        redirect: "false",
      })
    ).toBe("user=john&user=doe&redirect=false");
  });

  it("skips undefined values", () => {
    expect(
      serializeNextQueryParams({
        layout: "week_view",
        embed: undefined,
      })
    ).toBe("layout=week_view");
  });
});
