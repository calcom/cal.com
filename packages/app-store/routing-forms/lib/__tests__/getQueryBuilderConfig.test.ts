import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import type { RoutingForm } from "../../types/types";
import { FormFieldsInitialConfig } from "../InitialConfig";
import { getQueryBuilderConfigForFormFields } from "../getQueryBuilderConfig";

type MockedForm = Pick<RoutingForm, "fields">;
vi.mock("../InitialConfig", () => ({
  FormFieldsInitialConfig: {
    widgets: {
      text: { type: "text" },
      select: { type: "select" },
      multiselect: { type: "multiselect" },
      address: { type: "text" },
      url: { type: "text" },
      radio: { type: "select" },
      checkbox: { type: "multiselect" },
      boolean: { type: "select" },
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
      {
        id: "field4",
        label: "Address Field",
        type: "address",
      },
      {
        id: "field5",
        label: "URL Field",
        type: "url",
      },
      {
        id: "field6",
        label: "Radio Field",
        type: "radio",
        selectText: "Choice 1\nChoice 2",
      },
      {
        id: "field7",
        label: "Checkbox Field",
        type: "checkbox",
        selectText: "Choice A\nChoice B",
      },
      {
        id: "field8",
        label: "Boolean Field",
        type: "boolean",
      },
      {
        id: "field9",
        label: "Layout Field",
        type: "heading",
      },
      {
        id: "field10",
        label: "Date Field",
        type: "date",
      },
      {
        id: "field11",
        label: "Calendar Field",
        type: "calendar",
      },
    ],
  };

  it("should generate correct config for all field types", () => {
    const config = getQueryBuilderConfigForFormFields(mockForm);

    expect(config.fields).toHaveProperty("field1");
    expect(config.fields).toHaveProperty("field2");
    expect(config.fields).toHaveProperty("field3");
    expect(config.fields).toHaveProperty("field4");
    expect(config.fields).toHaveProperty("field5");
    expect(config.fields).toHaveProperty("field6");
    expect(config.fields).toHaveProperty("field7");
    expect(config.fields).toHaveProperty("field8");
    expect(config.fields).not.toHaveProperty("field9");
    expect(config.fields).not.toHaveProperty("field10");
    expect(config.fields).not.toHaveProperty("field11");

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

    expect(config.fields.field4).toEqual({
      label: "Address Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: {},
    });

    expect(config.fields.field5).toEqual({
      label: "URL Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: {},
    });

    expect(config.fields.field6).toEqual({
      label: "Radio Field",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: [
          { value: "Choice 1", title: "Choice 1" },
          { value: "Choice 2", title: "Choice 2" },
        ],
      },
    });

    expect(config.fields.field7).toEqual({
      label: "Checkbox Field",
      type: "multiselect",
      valueSources: ["value"],
      fieldSettings: {
        listValues: [
          { value: "Choice A", title: "Choice A" },
          { value: "Choice B", title: "Choice B" },
        ],
      },
    });

    expect(config.fields.field8).toEqual({
      label: "Boolean Field",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: [{ value: "true", title: "Checked" }],
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

  it("should skip unsupported field types", () => {
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

    const config = getQueryBuilderConfigForFormFields(formWithUnsupportedField);
    expect(config.fields).not.toHaveProperty("unsupportedField");
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
