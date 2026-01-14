import { describe, expect, test } from "bun:test";
import { slugify } from "../../utils/slugify";

describe("slugify", () => {
  test("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  test("converts to lowercase", () => {
    expect(slugify("HELLO")).toBe("hello");
  });

  test("replaces spaces with dashes", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  test("removes accents/diacritics", () => {
    expect(slugify("café")).toBe("cafe");
    expect(slugify("résumé")).toBe("resume");
  });

  test("replaces special characters with dashes", () => {
    expect(slugify("hello@world")).toBe("hello-world");
  });

  test("removes consecutive dashes", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  test("removes leading dashes", () => {
    expect(slugify("-hello")).toBe("hello");
  });

  test("removes trailing dashes when not forDisplayingInput", () => {
    expect(slugify("hello-")).toBe("hello");
  });

  test("keeps trailing dash when forDisplayingInput is true", () => {
    expect(slugify("hello-", true)).toBe("hello-");
  });

  test("handles periods correctly", () => {
    expect(slugify("hello.world")).toBe("hello.world");
    expect(slugify("hello..world")).toBe("hello.world");
    expect(slugify(".hello")).toBe("hello");
    expect(slugify("hello.")).toBe("hello");
  });

  test("removes emojis", () => {
    expect(slugify("hello 👋 world")).toBe("hello-world");
  });

  test("handles underscores", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  test("handles hash symbols", () => {
    expect(slugify("hello#world")).toBe("hello-world");
  });
});
