import { describe, expect, it } from "vitest";

import { filterEmbedParameter } from "./bookingSuccessRedirect";

describe("Booking Success Redirect", () => {
  it("removes embed parameter and keeps other parameters", () => {
    const params = new URLSearchParams();
    params.append("embed", "namespace");
    params.append("param1", "value1");
    params.append("cal.rerouting", "true");

    const filtered = filterEmbedParameter(params);

    expect(filtered.has("embed")).toBe(false);
    expect(filtered.get("param1")).toBe("value1");
    expect(filtered.get("cal.rerouting")).toBe("true");
  });
});
