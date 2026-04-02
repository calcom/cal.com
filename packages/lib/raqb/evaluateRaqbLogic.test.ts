import { FormFieldsBaseConfig } from "@calcom/routing-forms/components/react-awesome-query-builder/config/config";
import { describe, expect, it, vi } from "vitest";
import { evaluateRaqbLogic, RaqbLogicResult } from "./evaluateRaqbLogic";

vi.mock("../components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));

describe("evaluateRaqbLogic", () => {
  it("should return a match for multiselect_equals", () => {
    const result = evaluateRaqbLogic({
      queryValue: {
        id: "88bbb99b-cdef-4012-b456-71925b0e4b7f",
        type: "group",
        children1: {
          "b9aa9b89-0123-4456-b89a-b19264fe16af": {
            type: "rule",
            properties: {
              field: "0f18439b-2e28-45eb-bd79-8ed9e0236d6e",
              value: [["nevada"]],
              operator: "multiselect_equals",
              valueSrc: ["value"],
              valueType: ["multiselect"],
            },
          },
        },
      },
      queryBuilderConfig: {
        ...FormFieldsBaseConfig,
        fields: {
          "0f18439b-2e28-45eb-bd79-8ed9e0236d6e": {
            label: "Geographic States",
            type: "multiselect",
            valueSources: ["value"],
            fieldSettings: {
              listValues: [
                { title: "Arizona", value: "arizona" },
                { title: "Nevada", value: "nevada" },
                { title: "California", value: "california" },
              ],
            },
          },
        },
      },
      data: {
        "15a746c6-179f-4457-bc9f-76d14164dc13": "no",
        "0f18439b-2e28-45eb-bd79-8ed9e0236d6e": ["nevada"],
      },
    });

    expect(result).toBe(RaqbLogicResult.MATCH);
  });
});
