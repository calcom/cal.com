import { describe, it, expect } from "vitest";

import type { AppCategories } from "@calcom/prisma/enums";

import getAppCategoryTitle from "./getAppCategoryTitle";

describe("getAppCategoryTitle", () => {
  it("should return 'CRM' for crm variant (always uppercase)", () => {
    expect(getAppCategoryTitle("crm" as AppCategories)).toBe("CRM");
  });

  it("should return CRM even when returnLowerCase is true", () => {
    expect(getAppCategoryTitle("crm" as AppCategories, true)).toBe("CRM");
  });

  it("should return variant as-is when not crm", () => {
    expect(getAppCategoryTitle("calendar" as AppCategories)).toBe("calendar");
  });

  it("should return lowercase when returnLowerCase is true for non-CRM", () => {
    expect(getAppCategoryTitle("CALENDAR" as AppCategories, true)).toBe("calendar");
  });
});
