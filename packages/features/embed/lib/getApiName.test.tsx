import { describe, it, expect } from "vitest";

import { getApiNameWithNamespace } from "./getApiName";

describe("getApiNameWithNamespace", () => {
  describe("when namespace is a valid variable", () => {
    it("should return the correct API name with namespace for a non-hyphenated namespace", () => {
      const result = getApiNameWithNamespace({ namespace: "first", mainApiName: "cal" });
      expect(result).toBe("cal.ns.first");
    });
    it("should return the correct API name with namespace for a$b", () => {
      const result = getApiNameWithNamespace({ namespace: "a$b", mainApiName: "cal" });
      expect(result).toBe("cal.ns.a$b");
    });
  });

  describe("when namespace is not a valid variable", () => {
    it("should return the correct API name with namespace for a hyphenated namespace", () => {
      const result = getApiNameWithNamespace({ namespace: "first-one", mainApiName: "cal" });
      expect(result).toBe('cal.ns["first-one"]');
    });

    it("should return the correct API name with namespace for a&n", () => {
      const result = getApiNameWithNamespace({ namespace: "a&n", mainApiName: "cal" });
      expect(result).toBe('cal.ns["a&n"]');
    });
  });
});
