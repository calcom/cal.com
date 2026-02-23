import { describe, expect, it } from "vitest";
import { NoopShortener } from "../providers/NoopShortener";

describe("NoopShortener", () => {
  it("returns original URLs unchanged", async () => {
    const shortener = new NoopShortener();

    const result = await shortener.shortenMany(["https://example1.com", "https://example2.com"]);

    expect(result).toEqual([{ shortLink: "https://example1.com" }, { shortLink: "https://example2.com" }]);
  });

  it("handles empty array", async () => {
    const shortener = new NoopShortener();

    const result = await shortener.shortenMany([]);

    expect(result).toEqual([]);
  });

  it("handles empty strings", async () => {
    const shortener = new NoopShortener();

    const result = await shortener.shortenMany(["", "", ""]);

    expect(result).toEqual([{ shortLink: "" }, { shortLink: "" }, { shortLink: "" }]);
  });

  it("ignores options parameter", async () => {
    const shortener = new NoopShortener();

    const result = await shortener.shortenMany(["https://example.com"], {
      domain: "custom.com",
      folderId: "folder123",
    });

    expect(result).toEqual([{ shortLink: "https://example.com" }]);
  });
});
