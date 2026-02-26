import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getMetadataHelpers } from "./getMetadataHelpers";

const testSchema = z.object({
  foo: z.string().optional(),
  bar: z.number().optional(),
  baz: z.boolean().optional(),
});

describe("getMetadataHelpers", () => {
  it("parses raw metadata using the provided Zod schema", () => {
    const { metadata } = getMetadataHelpers(testSchema, { foo: "hello", bar: 42 });
    expect(metadata).toEqual({ foo: "hello", bar: 42 });
  });

  it("returns parsed metadata object", () => {
    const { metadata } = getMetadataHelpers(testSchema, { foo: "test" });
    expect(metadata.foo).toBe("test");
    expect(metadata.bar).toBeUndefined();
  });

  it("get() returns value for a specific key", () => {
    const { get } = getMetadataHelpers(testSchema, { foo: "value", bar: 10 });
    expect(get("foo")).toBe("value");
    expect(get("bar")).toBe(10);
  });

  it("mergeMetadata() merges new values with existing metadata", () => {
    const { mergeMetadata } = getMetadataHelpers(testSchema, { foo: "old", bar: 1 });
    const result = mergeMetadata({ bar: 2 } as z.infer<typeof testSchema>);
    expect(result).toEqual({ foo: "old", bar: 2 });
  });

  it("mergeMetadata() removes keys that are explicitly set to undefined", () => {
    const { mergeMetadata } = getMetadataHelpers(testSchema, { foo: "keep", bar: 42 });
    const result = mergeMetadata({ bar: undefined } as z.infer<typeof testSchema>);
    expect(result).toEqual({ foo: "keep" });
    expect("bar" in result).toBe(false);
  });

  it("mergeMetadata() does not remove keys that are not in newMetadata", () => {
    const { mergeMetadata } = getMetadataHelpers(testSchema, { foo: "keep", bar: 42, baz: true });
    const result = mergeMetadata({ foo: "updated" } as z.infer<typeof testSchema>);
    expect(result).toEqual({ foo: "updated", bar: 42, baz: true });
  });

  it("throws when rawMetadata fails schema validation", () => {
    expect(() => getMetadataHelpers(testSchema, { foo: 123 })).toThrow();
  });

  it("works with different Zod schemas", () => {
    const otherSchema = z.object({ name: z.string(), count: z.number() });
    const { metadata, get } = getMetadataHelpers(otherSchema, { name: "test", count: 5 });
    expect(metadata).toEqual({ name: "test", count: 5 });
    expect(get("name")).toBe("test");
  });
});
