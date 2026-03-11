import { describe, expect, it } from "vitest";

import {
  FIELD_TYPES_WITH_OPTIONS,
  FIELD_TYPE_TO_RAQB_WIDGET_TYPE,
  FieldTypes,
  RoutingFormFieldType,
  isValidRoutingFormFieldType,
} from "../FieldTypes";

describe("FieldTypes", () => {
  it("recognizes all supported routing form field types", () => {
    const values = FieldTypes.map((field) => field.value);
    expect(values).toEqual([
      RoutingFormFieldType.TEXT,
      RoutingFormFieldType.NUMBER,
      RoutingFormFieldType.TEXTAREA,
      RoutingFormFieldType.SINGLE_SELECT,
      RoutingFormFieldType.MULTI_SELECT,
      RoutingFormFieldType.PHONE,
      RoutingFormFieldType.EMAIL,
      RoutingFormFieldType.ADDRESS,
      RoutingFormFieldType.CHECKBOX,
      RoutingFormFieldType.RADIO,
      RoutingFormFieldType.BOOLEAN,
      RoutingFormFieldType.URL,
      RoutingFormFieldType.MULTI_EMAIL,
    ]);
  });

  it("marks the extended field types as valid", () => {
    expect(isValidRoutingFormFieldType("address")).toBe(true);
    expect(isValidRoutingFormFieldType("checkbox")).toBe(true);
    expect(isValidRoutingFormFieldType("radio")).toBe(true);
    expect(isValidRoutingFormFieldType("boolean")).toBe(true);
    expect(isValidRoutingFormFieldType("url")).toBe(true);
    expect(isValidRoutingFormFieldType("multiemail")).toBe(true);
    expect(isValidRoutingFormFieldType("future_type")).toBe(false);
  });

  it("tracks which field types require options", () => {
    expect(FIELD_TYPES_WITH_OPTIONS).toEqual([
      RoutingFormFieldType.SINGLE_SELECT,
      RoutingFormFieldType.MULTI_SELECT,
      RoutingFormFieldType.CHECKBOX,
      RoutingFormFieldType.RADIO,
    ]);
  });

  it("maps field types to expected raqb widgets", () => {
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.TEXT]).toBe("text");
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.NUMBER]).toBe("number");
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.SINGLE_SELECT]).toBe("select");
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.MULTI_SELECT]).toBe("multiselect");
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.CHECKBOX]).toBe("multiselect");
    expect(FIELD_TYPE_TO_RAQB_WIDGET_TYPE[RoutingFormFieldType.RADIO]).toBe("select");
  });
});
