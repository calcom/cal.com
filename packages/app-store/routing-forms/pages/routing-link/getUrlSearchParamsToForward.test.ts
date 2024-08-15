import { describe, it, expect } from "vitest";

import { getUrlSearchParamsToForward } from "./getUrlSearchParamsToForward";

function fromEntriesWithDuplicateKeys(entries: IterableIterator<[string, string]> | null) {
  const result: Record<string, string | string[]> = {};

  if (entries === null) {
    return result;
  }

  // Consider setting atleast ES2015 as target
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  for (const [key, value] of entries) {
    if (result.hasOwnProperty(key)) {
      let currentValue = result[key];
      if (!Array.isArray(currentValue)) {
        currentValue = [currentValue];
      }
      currentValue.push(value);
      result[key] = currentValue;
    } else {
      result[key] = value;
    }
  }
  return result;
}

describe("getUrlSearchParamsToForward", () => {
  it("should build query params from response correctly when identifier is present in fields", () => {
    const formResponse = {
      field1: { value: "value1", label: "Field 1" },
      field2: { value: ["option1", "option2"], label: "Field 2" },
    };

    const fields = [
      { id: "field1", identifier: "f1", type: "text", label: "Field 1" },
      {
        id: "field2",
        identifier: "f2",
        label: "Field 2",
        type: "multiselect",
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
        ],
      },
    ];

    const searchParams = new URLSearchParams("?query1=value1&query2=value2");
    const expectedParams = {
      f1: "value1",
      f2: ["Option 1", "Option 2"],
      query1: "value1",
      query2: "value2",
    };

    const result = getUrlSearchParamsToForward({
      formResponse,
      fields,
      searchParams,
    });
    expect(fromEntriesWithDuplicateKeys(result.entries())).toEqual(expectedParams);
  });

  it("should build query params from response correctly when identifier is not present in fields. Should fallback to label", () => {
    const formResponse = {
      field1: { value: "value1" },
      field2: { value: "value2" },
    };

    const fields = [
      { id: "field1", label: "Field 1", type: "text" },
      { id: "field2", label: "Field 2", type: "text" },
    ];

    const searchParams = new URLSearchParams("?query1=value1&query2=value2");

    const expectedParams = {
      "Field 1": "value1",
      "Field 2": "value2",
      query1: "value1",
      query2: "value2",
    };

    const result = getUrlSearchParamsToForward({
      formResponse,
      fields,
      searchParams,
    });
    expect(fromEntriesWithDuplicateKeys(result.entries())).toEqual(expectedParams);
  });

  it("should handle select fields correctly when options have id set", () => {
    const formResponse = {
      field1: { value: "Option 1" },
      field2: { value: ["Option 1", "Option 2"] },
    };

    const fields = [
      {
        id: "field1",
        label: "Field 1",
        type: "select",
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
        ],
      },
      {
        id: "field2",
        label: "Field 2",
        type: "multiselect",
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
          { id: "option3", label: "Option 3" },
        ],
      },
    ];

    const searchParams = new URLSearchParams("?query1=value1&query2=value2");

    const expectedParams = {
      "Field 1": "Option 1",
      "Field 2": ["Option 1", "Option 2"],
      query1: "value1",
      query2: "value2",
    };

    const result = getUrlSearchParamsToForward({
      formResponse,
      fields,
      searchParams,
    });
    expect(fromEntriesWithDuplicateKeys(result.entries())).toEqual(expectedParams);
  });

  it("should handle select fields correctly when options have no id set(Legacy options)", () => {
    const formResponse = {
      field1: { value: "Option 1" },
      field2: { value: ["Option 1", "Option 2"] },
    };

    const fields = [
      {
        id: "field1",
        label: "Field 1",
        type: "select",
        options: [
          { id: null, label: "Option 1" },
          { id: null, label: "Option 2" },
        ],
      },
      {
        id: "field2",
        label: "Field 2",
        type: "multiselect",
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
          { id: "option3", label: "Option 3" },
        ],
      },
    ];

    const searchParams = new URLSearchParams("?query1=value1&query2=value2");

    const expectedParams = {
      "Field 1": "Option 1",
      "Field 2": ["Option 1", "Option 2"],
      query1: "value1",
      query2: "value2",
    };

    const result = getUrlSearchParamsToForward({
      formResponse,
      fields,
      searchParams,
    });
    expect(fromEntriesWithDuplicateKeys(result.entries())).toEqual(expectedParams);
  });

  it("should handle number values correctly", () => {
    const response = {
      field1: { value: 123 },
    };

    const fields = [{ id: "field1", label: "Field 1", type: "number" }];

    const searchParams = new URLSearchParams("?query1=value1&query2=value2");
    const expectedParams = {
      "Field 1": "123",
      query1: "value1",
      query2: "value2",
    };

    const result = getUrlSearchParamsToForward({
      formResponse: response,
      fields,
      searchParams,
    });
    expect(fromEntriesWithDuplicateKeys(result.entries())).toEqual(expectedParams);
  });
});
