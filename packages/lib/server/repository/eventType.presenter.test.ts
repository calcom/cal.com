import { describe, it, expect } from "vitest";

import { presentEventType } from "./eventType.presenter";

describe("presentEventType", () => {
  it("transforms description to descriptionAsSafeHTML and parses metadata", () => {
    const raw = {
      description: "**Bold** text",
      metadata: { apps: {} },
      foo: 123,
    };
    const result = presentEventType(raw);
    expect(result.descriptionAsSafeHTML).toContain("<strong>");
    expect(result.metadata).toHaveProperty("apps");
    expect(result.foo).toBe(123);
  });

  it("handles null description and metadata", () => {
    const raw = {
      description: null,
      metadata: null,
      bar: "baz",
    };
    const result = presentEventType(raw);
    expect(result.descriptionAsSafeHTML).toBe("");
    expect(result.metadata).toBeNull();
    expect(result.bar).toBe("baz");
  });

  it("passes through all other properties", () => {
    const raw = {
      description: "Hello",
      metadata: { apps: {} },
      extra: "value",
      another: 42,
    };
    const result = presentEventType(raw);
    expect(result.extra).toBe("value");
    expect(result.another).toBe(42);
  });
});
