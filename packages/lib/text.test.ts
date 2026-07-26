import { describe, expect, it } from "vitest";

import { truncate, truncateOnWord } from "./text";

describe("Text util tests", () => {
  describe("fn: truncate", () => {
    it("should return the original text when it is shorter than the max length", () => {
      const cases = [
        {
          input: "Hello world",
          maxLength: 100,
          expected: "Hello world",
        },
        {
          input: "Hello world",
          maxLength: 11,
          expected: "Hello world",
        },
      ];

      for (const { input, maxLength, expected } of cases) {
        const result = truncate(input, maxLength);

        expect(result).toEqual(expected);
      }
    });

    it("should return the truncated text when it is longer than the max length", () => {
      const cases = [
        {
          input: "Hello world",
          maxLength: 10,
          expected: "Hello w...",
        },
        {
          input: "Hello world",
          maxLength: 5,
          expected: "He...",
        },
      ];

      for (const { input, maxLength, expected } of cases) {
        const result = truncate(input, maxLength);

        expect(result).toEqual(expected);
      }
    });

    it("should return the truncated text without ellipsis when it is longer than the max length and ellipsis is false", () => {
      const cases = [
        {
          input: "Hello world",
          maxLength: 10,
          ellipsis: false,
          expected: "Hello w",
        },
        {
          input: "Hello world",
          maxLength: 5,
          ellipsis: false,
          expected: "He",
        },
      ];

      for (const { input, maxLength, ellipsis, expected } of cases) {
        const result = truncate(input, maxLength, ellipsis);

        expect(result).toEqual(expected);
      }
    });
  });

  describe("fn: truncateOnWord", () => {
    it("should return the original text when it is not longer than the max length", () => {
      expect(truncateOnWord("Hello world", 100)).toEqual("Hello world");
      expect(truncateOnWord("Hello world", 11)).toEqual("Hello world");
    });

    it("should break on the last word boundary", () => {
      expect(truncateOnWord("Book a meeting with our team", 20)).toEqual("Book a meeting...");
    });

    it("should honour the maxLength it is given", () => {
      const text = "Book a meeting with our team ".repeat(20);

      for (const maxLength of [20, 60, 158, 300]) {
        expect(truncateOnWord(text, maxLength).length).toBeLessThanOrEqual(maxLength);
      }

      // A larger budget must produce a longer result — the previous
      // implementation always cut at a hard-coded 148 characters.
      expect(truncateOnWord(text, 300).length).toBeGreaterThan(truncateOnWord(text, 158).length);
    });

    it("should never return a string longer than maxLength, ellipsis included", () => {
      const text = "a".repeat(500);

      expect(truncateOnWord(text, 10)).toEqual("aaaaaaa...");
      expect(truncateOnWord(text, 10).length).toEqual(10);
      expect(truncateOnWord(text, 10, false).length).toEqual(10);
    });

    it("should fall back to a hard cut for languages without spaces", () => {
      const cases = [
        { input: "予約ページの説明文です。".repeat(30), label: "ja" },
        { input: "회의를예약하려면아래시간을선택하세요".repeat(20), label: "ko" },
        { input: "请选择下面的时间来预约会议".repeat(20), label: "zh" },
        { input: `https://example.com/${"a".repeat(200)}`, label: "url" },
      ];

      for (const { input, label } of cases) {
        const result = truncateOnWord(input, 158);

        // Previously every one of these collapsed to a bare "...".
        expect(result, label).not.toEqual("...");
        expect(result.length, label).toEqual(158);
        expect(result.startsWith(input.slice(0, 100)), label).toBe(true);
      }
    });

    it("should omit the ellipsis when asked", () => {
      const text = "Book a meeting with our team".repeat(10);

      expect(truncateOnWord(text, 30, false).endsWith("...")).toBe(false);
      expect(truncateOnWord(text, 30, false).length).toBeLessThanOrEqual(30);
    });
  });
});
