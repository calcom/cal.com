import { describe, it, expect } from "vitest";

import "../../../../../../../ui/components/test-setup";
import { getGroupOptionUpdate } from "../AttributesForm";

describe("getGroupOptionUpdate", () => {
  it("should add non-group option to new group's contains array", () => {
    const result = getGroupOptionUpdate({
      newGroupOptions: [{ label: "Group 1", value: "group1" }],
      previousGroupOptions: [],
      subOption: { attributeOptionId: "option1" },
      allOptions: [{ attributeOptionId: "group1", contains: [] }],
    });

    expect(result).toEqual({
      0: ["option1"],
    });
  });

  it("should remove non-group option from removed group's contains array", () => {
    const result = getGroupOptionUpdate({
      newGroupOptions: [],
      previousGroupOptions: [{ label: "Group 1", value: "group1" }],
      subOption: { attributeOptionId: "option1" },
      allOptions: [{ attributeOptionId: "group1", contains: ["option1", "option2"] }],
    });

    expect(result).toEqual({
      0: ["option2"],
    });
  });

  it("should handle multiple group updates simultaneously", () => {
    const result = getGroupOptionUpdate({
      newGroupOptions: [
        { label: "Group 1", value: "group1" },
        { label: "Group 2", value: "group2" },
      ],
      previousGroupOptions: [{ label: "Group 3", value: "group3" }],
      subOption: { attributeOptionId: "option1" },
      allOptions: [
        { attributeOptionId: "group1", contains: ["option2"] },
        { attributeOptionId: "group2", contains: [] },
        { attributeOptionId: "group3", contains: ["option1", "option3"] },
      ],
    });

    expect(result).toEqual({
      0: ["option2", "option1"],
      1: ["option1"],
      2: ["option3"],
    });
  });

  it("should prevent duplicate entries in contains array", () => {
    const result = getGroupOptionUpdate({
      newGroupOptions: [{ label: "Group 1", value: "group1" }],
      previousGroupOptions: [],
      subOption: { attributeOptionId: "option1" },
      allOptions: [{ attributeOptionId: "group1", contains: ["option1"] }],
    });

    expect(result).toEqual({
      0: ["option1"], // Should not have duplicate "option1"
    });
  });

  it("should not consider a group option with undefined value", () => {
    const result = getGroupOptionUpdate({
      newGroupOptions: [{ label: "Group 1", value: undefined }],
      previousGroupOptions: [],
      subOption: { attributeOptionId: "option1" },
      allOptions: [{ attributeOptionId: "1", contains: ["option1"] }],
    });

    expect(result).toEqual({});
  });
});
