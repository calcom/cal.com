import { describe, expect, it, vi } from "vitest";
import type { RoutingForm } from "../../types/types";
import { getQueryBuilderConfigForFormFields } from "../getQueryBuilderConfig";
import { FormFieldsInitialConfig } from "../InitialConfig";

type MockedForm = Pick<RoutingForm, "fields">;
vi.mock("../InitialConfig", () => ({
  FormFieldsInitialConfig: {
    widgets: {
      text: { type: "text" },
      select: { type: "select" },
      multiselect: { type: "multiselect" },
    },
    operators: {
      is_empty: {},
      is_not_empty: {},
      between: {},
      not_between: {},
    },
  },
}));

describe("getQueryBuilderConfig", () => {
  const mockForm: MockedForm = {
    fields: [
      {
        id: "field1",
        label: "Text Field",
        type: "text",
      },
      {
        id: "field2",
        label: "Select Field",
        type: "select",
        selectText: "Option 1\nOption 2",
      },
      {
        id: "field3",
        label: "MultiSelect Field",
        type: "multiselect",
        selectText: "Option A\nOption B\nOption C",
      },
    ],
  };

  it("should generate correct config for all field types", () => {
    const config = getQueryBuilderConfigForFormFields(mockForm);

    expect(config.fields).toHaveProperty("field1");
    expect(config.fields).toHaveProperty("field2");
    expect(config.fields).toHaveProperty("field3");

    expect(config.fields.field1).toEqual({
      label: "Text Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: {},
    });

    expect(config.fields.field2).toEqual({
      label: "Select Field",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: [
          { value: "Option 1", title: "Option 1" },
          { value: "Option 2", title: "Option 2" },
        ],
      },
    });

    expect(config.fields.field3).toEqual({
      label: "MultiSelect Field",
      type: "multiselect",
      valueSources: ["value"],
      fieldSettings: {
        listValues: [
          { value: "Option A", title: "Option A" },
          { value: "Option B", title: "Option B" },
          { value: "Option C", title: "Option C" },
        ],
      },
    });
  });

  it("should handle router fields correctly", () => {
    const formWithRouterField: MockedForm = {
      ...mockForm,
      fields: [
        {
          id: "routerField",
          type: "router",
          label: "Router Field",
          routerId: "innerField",
          routerField: {
            id: "innerField",
            label: "Router Field",
            type: "text",
          },
        },
      ],
    };

    const config = getQueryBuilderConfigForFormFields(formWithRouterField);

    expect(config.fields).toHaveProperty("innerField");
    expect(config.fields.innerField).toEqual({
      label: "Router Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: {},
    });
  });

  it("should throw an error for unsupported field types", () => {
    const formWithUnsupportedField: MockedForm = {
      ...mockForm,
      fields: [
        {
          id: "unsupportedField",
          label: "Unsupported Field",
          type: "unsupported" as any,
        },
      ],
    };

    expect(() => getQueryBuilderConfigForFormFields(formWithUnsupportedField)).toThrow(
      "Unsupported field type:unsupported"
    );
  });

  it("should remove specific operators when forReporting is true", () => {
    const config = getQueryBuilderConfigForFormFields(mockForm, true);

    expect(config.operators).not.toHaveProperty("is_empty");
    expect(config.operators).not.toHaveProperty("is_not_empty");
    expect(config.operators).not.toHaveProperty("between");
    expect(config.operators).not.toHaveProperty("not_between");
    expect(config.operators.__calReporting).toBe(true);
  });

  it("should include all operators when forReporting is false", () => {
    const config = getQueryBuilderConfigForFormFields(mockForm, false);

    expect(config.operators).toHaveProperty("is_empty");
    expect(config.operators).toHaveProperty("is_not_empty");
    expect(config.operators).toHaveProperty("between");
    expect(config.operators).toHaveProperty("not_between");
    expect(config.operators.__calReporting).toBeUndefined();
  });

  it("should use InitialConfig as base for the returned config", () => {
    const config = getQueryBuilderConfigForFormFields(mockForm);

    expect(config).toEqual(
      expect.objectContaining({
        ...FormFieldsInitialConfig,
        fields: expect.any(Object),
      })
    );
  });
});
