import { describe, expect, it } from "vitest";

import type { Fields, FormResponse } from "../../types/types";
import { generateResponseHash } from "../utils";

function getFields(): Fields {
  return [
    {
      id: "uuid-1",
      label: "Test Field",
      identifier: "id-1",
    },
    {
      id: "uuid-2",
      label: "Number Field",
      identifier: "id-2",
    },
    {
      id: "uuid-3",
      label: "Multiselect Field",
      identifier: "id-3",
    },
    {
      id: "uuid-4-but-same-id-as-uuid-1",
      label: "Multiselect Field",
      identifier: "id-1",
    },
  ] as Fields;
}

describe("generateResponseHash", () => {
  it("should generate a same hash for the responses with different labels as long as the values are the same", () => {
    const fields = getFields();

    const response1: FormResponse = {
      "uuid-1": { value: "test value", label: "Test Field" },
      "uuid-2": { value: 123, label: "Number Field" },
      "uuid-3": { value: ["option1", "option2"], label: "Multiselect Field" },
    };

    const response2: FormResponse = {
      "uuid-1": { value: "test value", label: "Test Field New" },
      "uuid-2": { value: 123, label: "Number Field New" },
      "uuid-3": { value: ["option1", "option2"], label: "Multiselect Field New" },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different inputs", () => {
    const fields = getFields();
    const response1: FormResponse = {
      "uuid-1": { value: "test value", label: "Test Field", identifier: "id-1" },
    };

    const response2: FormResponse = {
      "uuid-1": { value: "different value", label: "Test Field", identifier: "id-1" },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).not.toBe(hash2);
  });

  it("should be case-insensitive in hash generation", () => {
    const fields = getFields();
    const response1: FormResponse = {
      "uuid-1": { value: "Test Value", label: "Test Field", identifier: "id-1" },
    };

    const response2: FormResponse = {
      "uuid-1": { value: "test value", label: "Test Field", identifier: "id-1" },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should handle array values correctly", () => {
    const fields = getFields();
    const response: FormResponse = {
      "uuid-3": { value: ["option1", "option2"], label: "Multiselect Field", identifier: "id-3" },
    };

    const response2: FormResponse = {
      "uuid-3": { value: ["OPTION1", "OPTION2"], label: "Multiselect Field", identifier: "id-3" },
    };

    const hash1 = generateResponseHash({ response, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should have same hash regardless of the order of the fields", () => {
    const fields = getFields();
    const response1: FormResponse = {
      "uuid-a": { value: "value a", label: "Field A", identifier: "id-a" },
      "uuid-b": { value: "value b", label: "Field B", identifier: "id-b" },
    };

    const response2: FormResponse = {
      "uuid-b": { value: "value b", label: "Field B", identifier: "id-b" },
      "uuid-a": { value: "value a", label: "Field A", identifier: "id-a" },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should generate same hash for fields with same identifier", () => {
    const fields = getFields();
    const response1: FormResponse = {
      "uuid-1": { value: "test value", label: "Multiselect Field", identifier: "id-1" },
    };

    const response2: FormResponse = {
      "uuid-4-but-same-id-as-uuid-1": { value: "test value", label: "Multiselect Field", identifier: "id-1" },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should consider identifier from fields object", () => {
    const fields = getFields();
    const response1: FormResponse = {
      "uuid-1": { value: "test value", label: "Multiselect Field", identifier: "id-anything-else" },
    };

    const response2: FormResponse = {
      "uuid-4-but-same-id-as-uuid-1": {
        value: "test value",
        label: "Multiselect Field",
        identifier: "id-anything",
      },
    };

    const hash1 = generateResponseHash({ response: response1, fields });
    const hash2 = generateResponseHash({ response: response2, fields });

    expect(hash1).toBe(hash2);
  });

  it("should handle empty responses", () => {
    const fields = getFields();
    const response: FormResponse = {};

    // Should not throw an error and should return a valid hash
    expect(() => generateResponseHash({ response, fields })).not.toThrow();
    expect(generateResponseHash({ response, fields })).toMatch(/^[0-9a-f]{64}$/);
  });
});
