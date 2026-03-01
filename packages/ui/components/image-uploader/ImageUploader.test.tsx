import { describe, expect, it, vi } from "vitest";

import { useFileReader } from "./Common";

vi.mock("./Common", async () => {
  const actual = await vi.importActual("./Common");
  return {
    ...actual,
  };
});

describe("useFileReader", () => {
  it("is exported as a function", () => {
    expect(typeof useFileReader).toBe("function");
  });
});

describe("ImageUploader module", () => {
  it("exports ImageUploader as default", async () => {
    const mod = await import("./ImageUploader");
    expect(mod.default).toBeDefined();
  });
});

describe("BannerUploader module", () => {
  it("exports BannerUploader as default", async () => {
    const mod = await import("./BannerUploader");
    expect(mod.default).toBeDefined();
  });
});
