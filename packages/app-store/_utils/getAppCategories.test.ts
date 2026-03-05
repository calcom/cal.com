import { describe, it, expect } from "vitest";

import getAppCategories from "./getAppCategories";

describe("getAppCategories", () => {
  it("should return all 8 categories", () => {
    const categories = getAppCategories("/apps/categories", false);
    expect(categories).toHaveLength(8);
    const names = categories.map((c) => c.name);
    expect(names).toContain("analytics");
    expect(names).toContain("automation");
    expect(names).toContain("calendar");
    expect(names).toContain("conferencing");
    expect(names).toContain("crm");
    expect(names).toContain("messaging");
    expect(names).toContain("payment");
    expect(names).toContain("other");
  });

  it("should use path segments when useQueryParam is false", () => {
    const categories = getAppCategories("/apps/categories", false);
    const analytics = categories.find((c) => c.name === "analytics");
    expect(analytics).toBeDefined();
    expect(analytics!.href).toBe("/apps/categories/analytics");
  });

  it("should use search params when useQueryParam is true", () => {
    const categories = getAppCategories("/apps/categories", true);
    const analytics = categories.find((c) => c.name === "analytics");
    expect(analytics).toBeDefined();
    expect(analytics!.href).toContain("category=analytics");
  });

  it("should have correct icon and data-testid for each entry", () => {
    const categories = getAppCategories("/apps", false);
    for (const category of categories) {
      expect(category.icon).toBeDefined();
      expect(typeof category.icon).toBe("string");
      expect(category["data-testid"]).toBe(category.name);
    }
  });
});
