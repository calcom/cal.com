import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../getStaticProps";

describe("parseFrontmatter", () => {
  describe("valid frontmatter parsing", () => {
    it("parses frontmatter with items array", () => {
      const source = `---
items:
  - 1.jpg
  - 2.png
---
Some content here`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({ items: ["1.jpg", "2.png"] });
      expect(result.content).toBe("Some content here");
    });

    it("parses frontmatter with description only", () => {
      const source = `---
description: A simple description
---
Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({ description: "A simple description" });
      expect(result.content).toBe("Content");
    });

    it("parses items with iframe objects", () => {
      const source = `---
items:
  - iframe: { src: https://youtube.com/embed/abc }
  - 1.jpg
---
Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({
        items: [{ iframe: { src: "https://youtube.com/embed/abc" } }, "1.jpg"],
      });
      expect(result.content).toBe("Content");
    });
  });

  describe("edge cases", () => {
    it("returns empty data when no frontmatter present", () => {
      const source = "Just plain text content";

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({});
      expect(result.content).toBe("Just plain text content");
    });

    it("parses simple frontmatter correctly", () => {
      const source = `---
items:
  - test.jpg
---
Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({ items: ["test.jpg"] });
      expect(result.content).toBe("Content");
    });

    it("preserves blank line after frontmatter", () => {
      const source = `---
title: Test
---

Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({ title: "Test" });
      expect(result.content).toBe("\nContent");
    });

    it("returns empty data for non-object frontmatter (array root)", () => {
      const source = `---
- item1
- item2
---
Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({});
      expect(result.content).toBe("Content");
    });
  });

  describe("security (JSON_SCHEMA protection)", () => {
    it("returns empty data on unsafe YAML types", () => {
      const source = `---
date: !!js/date 2024-01-01
---
Content`;

      const result = parseFrontmatter(source);

      expect(result.data).toEqual({});
      expect(result.content).toBe("Content");
    });
  });
});
