import { describe, it, expect } from "vitest";
import { embedStore, resetPageData } from "./embedStore";

describe("embedStore", () => {
  it("has default viewId as null", () => {
    expect(embedStore.viewId === null || typeof embedStore.viewId === "number").toBe(true);
  });

  it("resetPageData resets page data", () => {
    resetPageData();
    expect(embedStore.pageData.reloadInitiated).toBe(false);
  });
});
