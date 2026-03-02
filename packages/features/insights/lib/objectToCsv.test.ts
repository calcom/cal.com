import { describe, it, expect } from "vitest";

import { objectToCsv } from "./objectToCsv";

describe("objectToCsv", () => {
  it("should return empty string for empty array", () => {
    expect(objectToCsv([])).toBe("");
  });

  it("should generate headers from first object keys", () => {
    const data = [{ name: "Alice", email: "alice@example.com" }];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name,email");
  });

  it("should generate correct CSV rows", () => {
    const data = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[0]).toBe("name,email");
    expect(lines[1]).toBe("Alice,alice@example.com");
    expect(lines[2]).toBe("Bob,bob@example.com");
  });

  it("should wrap values containing commas in quotes", () => {
    const data = [{ name: "Doe, John", email: "john@example.com" }];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"Doe, John",john@example.com');
  });

  it("should wrap values containing newlines in quotes", () => {
    const data = [{ name: "Line1\nLine2", email: "test@example.com" }];
    const result = objectToCsv(data);
    expect(result).toContain('"Line1\nLine2"');
  });

  it("should escape double quotes by doubling them", () => {
    const data = [{ name: 'She said "hello"', email: "test@example.com" }];
    const result = objectToCsv(data);
    expect(result).toContain('"She said ""hello"""');
  });

  it("should handle empty string values", () => {
    const data = [{ name: "", email: "test@example.com" }];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines[1]).toBe(",test@example.com");
  });

  it("should handle undefined values gracefully", () => {
    const data = [{ name: "Alice" }] as Record<string, string>[];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name");
    expect(lines[1]).toBe("Alice");
  });

  it("should handle single column data", () => {
    const data = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const result = objectToCsv(data);
    const lines = result.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("id");
  });

  it("should handle values with both commas and quotes", () => {
    const data = [{ value: 'Hello, "World"' }];
    const result = objectToCsv(data);
    expect(result).toContain('"Hello, ""World"""');
  });
});
