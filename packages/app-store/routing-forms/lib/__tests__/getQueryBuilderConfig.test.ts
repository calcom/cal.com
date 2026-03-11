import { describe, it, expect, vi } from "vitest";

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
      number: { type: "number" },
      phone: { type: "text" },
      email: { type: "text" },
      address: { type: "text" },
      url: { type: "text" },
      multiemail: { type: "text" },
      boolean: { type: "text" },
      checkbox: { type: "multiselect" },
      radio: { type: "select" },
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

    expect(config.fields.field1).toEqual({
      label: "Text Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: { listValues: undefined },
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

    expect(config.fields.innerField).toEqual({
      label: "Router Field",
      type: "text",
      valueSources: ["value"],
      fieldSettings: { listValues: undefined },
    });
  });

  it("should gracefully fallback unknown field types to text", () => {
    const config = getQueryBuilderConfigForFormFields({
      fields: [{ id: "x", label: "Unknown", type: "future_type" as any }],
    });

    expect(config.fields.x).toEqual({
      label: "Unknown",
      type: "text",
      valueSources: ["value"],
      fieldSettings: { listValues: undefined },
    });
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

  it("supports extended text-like field types", () => {
    const form: MockedForm = {
      fields: [
        { id: "address", label: "Address", type: "address" },
        { id: "url", label: "URL", type: "url" },
        { id: "multiemail", label: "Multi Email", type: "multiemail" },
        { id: "boolean", label: "Boolean", type: "boolean" },
      ],
    };
    const config = getQueryBuilderConfigForFormFields(form);
    expect(config.fields.address.type).toBe("text");
    expect(config.fields.url.type).toBe("text");
    expect(config.fields.multiemail.type).toBe("text");
    expect(config.fields.boolean.type).toBe("text");
  });

  it("supports checkbox and radio option field types", () => {
    const form: MockedForm = {
      fields: [
        {
          id: "checkbox",
          label: "Checkbox",
          type: "checkbox",
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        },
        {
          id: "radio",
          label: "Radio",
          type: "radio",
          options: [
            { id: "x", label: "X" },
            { id: "y", label: "Y" },
          ],
        },
      ],
    };
    const config = getQueryBuilderConfigForFormFields(form);
    expect(config.fields.checkbox.type).toBe("multiselect");
    expect(config.fields.checkbox.fieldSettings.listValues).toEqual([
      { value: "a", title: "A" },
      { value: "b", title: "B" },
    ]);
    expect(config.fields.radio.type).toBe("select");
    expect(config.fields.radio.fieldSettings.listValues).toEqual([
      { value: "x", title: "X" },
      { value: "y", title: "Y" },
    ]);
  });
});
