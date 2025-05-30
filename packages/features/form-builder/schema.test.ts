/* eslint-disable playwright/no-conditional-in-test */
import { describe, it, expect } from "vitest";
import type { z } from "zod";

import type {
  /* ← root array‐of‐fields schema */
  fieldSchema as FieldSchema,
} from "./schema";
import {
  fieldsSchema as schema,
  /* ← array-of-fields schema */
} from "./schema";

/** All field-types supported by the current schema (mirrors the enum in `schema.ts`) */
const FIELD_TYPES = [
  "name",
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "address",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "radioInput",
  "boolean",
  "url",
] as const;

/** convenience factory: start from the bare minimum & override per-test */
const makeField = (overrides: Partial<z.infer<typeof FieldSchema>> = {}): z.infer<typeof FieldSchema> => ({
  name: "my-field",
  label: "My field",
  type: "text",
  required: false,
  ...overrides,
});

/** a baseline, always-valid payload we can mutate */
const validPayload = [
  makeField(), // 0 – default text field
  makeField({ name: "age", type: "number", required: true }), // 1 – required number
] as const;

describe("form-builder schema", () => {
  it("accepts a fully valid payload", async () => {
    const parsed = await schema.parseAsync(validPayload);
    expect(parsed).toEqual(validPayload);
  });

  it("rejects an unknown `type`", async () => {
    // @ts-expect-error – deliberate wrong type value
    const payload = [...validPayload, makeField({ type: "made-up" })];

    const res = await schema.safeParseAsync(payload);
    expect(res.success).toBe(false);
    if (res.success) throw new Error("should not succeed");

    expect(res.error.issues[0]).toEqual(
      expect.objectContaining({
        path: [2, "type"],
        message: expect.stringMatching(/Invalid enum value/),
      })
    );
  });

  it("accepts every declared field-type", async () => {
    const everyType = FIELD_TYPES.map((t, i) => makeField({ name: `field_${i}`, type: t }));
    const parsed = await schema.parseAsync(everyType);
    expect(parsed).toHaveLength(FIELD_TYPES.length);
  });

  describe("`visibleIf` logic", () => {
    const parent = makeField({ name: "country", type: "select" });

    it("allows a well-formed `visibleIf` clause", async () => {
      const child = makeField({
        name: "city",
        visibleIf: { parent: "country", values: ["us", "ca"] },
      });

      const parsed = await schema.parseAsync([parent, child]);
      expect(parsed[1].visibleIf).toEqual(child.visibleIf);
    });
  });
});
