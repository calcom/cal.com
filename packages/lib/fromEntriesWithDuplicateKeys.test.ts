import { describe, expect, it } from "vitest";

import { fromEntriesWithDuplicateKeys } from "./fromEntriesWithDuplicateKeys";

function* makeEntries(pairs: [string, string][]): IterableIterator<[string, string]> {
  for (const pair of pairs) {
    yield pair;
  }
}

describe("fromEntriesWithDuplicateKeys", () => {
  it("returns empty object for null input", () => {
    expect(fromEntriesWithDuplicateKeys(null)).toEqual({});
  });

  it("handles single entry", () => {
    const entries = makeEntries([["key", "value"]]);
    expect(fromEntriesWithDuplicateKeys(entries)).toEqual({ key: "value" });
  });

  it("handles multiple unique keys", () => {
    const entries = makeEntries([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    expect(fromEntriesWithDuplicateKeys(entries)).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("combines duplicate keys into an array", () => {
    const entries = makeEntries([
      ["color", "red"],
      ["color", "blue"],
    ]);
    expect(fromEntriesWithDuplicateKeys(entries)).toEqual({ color: ["red", "blue"] });
  });

  it("accumulates more than 2 duplicate values into an array", () => {
    const entries = makeEntries([
      ["tag", "a"],
      ["tag", "b"],
      ["tag", "c"],
    ]);
    expect(fromEntriesWithDuplicateKeys(entries)).toEqual({ tag: ["a", "b", "c"] });
  });

  it("keeps unique keys as strings and duplicate keys as arrays", () => {
    const entries = makeEntries([
      ["name", "Alice"],
      ["color", "red"],
      ["color", "blue"],
      ["age", "30"],
    ]);
    const result = fromEntriesWithDuplicateKeys(entries);
    expect(result).toEqual({
      name: "Alice",
      color: ["red", "blue"],
      age: "30",
    });
  });

  it("handles empty iterator", () => {
    const entries = makeEntries([]);
    expect(fromEntriesWithDuplicateKeys(entries)).toEqual({});
  });
});
