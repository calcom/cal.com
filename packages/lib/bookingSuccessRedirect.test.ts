import { describe, expect, it } from "vitest";

import { filterEmbedParameter } from "./bookingSuccessRedirect";

describe("Booking Success Redirect", () => {
  it(" removes embed parameter", () => {
    const params = new URLSearchParams();
    params.append("embed", "namespace");
    params.append("param1", "value1");

    const filtered = filterEmbedParameter(params, true);

    expect(filtered.has("embed")).toBe(false);
    expect(filtered.get("param1")).toBe("value1");
  });

  it("keeps embed parameter ", () => {
    const params = new URLSearchParams();
    params.append("embed", "namespace");
    params.append("param1", "value1");

    const filtered = filterEmbedParameter(params, false);

    expect(filtered.has("embed")).toBe(true);
    expect(filtered.get("embed")).toBe("namespace");
    expect(filtered.get("param1")).toBe("value1");
  });
});
