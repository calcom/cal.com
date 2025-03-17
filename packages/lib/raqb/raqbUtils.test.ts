import { expect, describe, it } from "vitest";

import { getValueOfAttributeOption } from "./raqbUtils";

describe("getValueOfAttributeOption", () => {
  it("should return non-array value for non-array input - It is a requirement for RAQB to not unnecessarily transform single value to an array of one item", () => {
    const input = { value: "option1", isGroup: false, contains: [] };
    const result = getValueOfAttributeOption(input);
    expect(result).toEqual("option1");
  });

  it("should return flat array of values for simple options", () => {
    const input = [
      { value: "option1", isGroup: false, contains: [] },
      { value: "option2", isGroup: false, contains: [] },
    ];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual(["option1", "option2"]);
  });

  it("should flatten nested options from contains array", () => {
    const input = [
      {
        value: "group1",
        isGroup: true,
        contains: [
          { value: "suboption1", id: "opt-1", slug: "option-1" },
          { value: "suboption2", id: "opt-2", slug: "option-2" },
        ],
      },
    ];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual(["suboption1", "suboption2"]);
  });

  it("should handle mix of simple and nested options", () => {
    const input = [
      { value: "option1", isGroup: false, contains: [] },
      {
        value: "group1",
        isGroup: true,
        contains: [
          { value: "suboption1", id: "opt-1", slug: "option-1" },
          { value: "suboption2", id: "opt-2", slug: "option-2" },
        ],
      },
      { value: "option2", isGroup: false, contains: [] },
    ];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual(["option1", "suboption1", "suboption2", "option2"]);
  });

  it("should remove duplicate values", () => {
    const input = [
      { value: "option1", isGroup: false, contains: [] },
      {
        value: "group1",
        isGroup: true,
        contains: [
          { value: "option1", id: "opt-1", slug: "option-1" },
          { value: "suboption2", id: "opt-2", slug: "option-2" },
        ],
      },
    ];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual(["option1", "suboption2"]);
  });

  it("should handle empty input array", () => {
    const input: {
      value: string;
      isGroup: boolean;
      contains: { value: string; id: string; slug: string }[];
    }[] = [];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual([]);
  });

  it("should still use contains if contains is empty and isGroup=true", () => {
    const input = [{ value: "group1", isGroup: true, contains: [] }];

    const result = getValueOfAttributeOption(input);
    expect(result).toEqual([]);
  });
});
