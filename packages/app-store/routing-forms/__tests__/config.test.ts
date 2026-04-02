import { describe, expect, it, vi } from "vitest";
import {
  AttributesBaseConfig,
  FormFieldsBaseConfig,
} from "../components/react-awesome-query-builder/config/config";

vi.mock("../components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));

const assertCommonStructure = (config: any) => {
  expect(config).toHaveProperty("conjunctions");
  expect(config).toHaveProperty("operators");
  expect(config).toHaveProperty("types");
  expect(config).toHaveProperty("widgets");
  expect(config).toHaveProperty("settings");
};

const assertCommonWidgetTypes = (config: any) => {
  expect(config.widgets).toHaveProperty("text");
  expect(config.widgets).toHaveProperty("textarea");
  expect(config.widgets).toHaveProperty("number");
  expect(config.widgets).toHaveProperty("multiselect");
  expect(config.widgets).toHaveProperty("select");
  expect(config.widgets).toHaveProperty("phone");
  expect(config.widgets).toHaveProperty("email");
};

const assertSelectOperators = (config: any) => {
  expect(config.operators).toHaveProperty("select_any_in");
  expect(config.operators).toHaveProperty("select_not_any_in");
  expect(config.operators).toHaveProperty("select_equals");
  expect(config.operators).toHaveProperty("select_not_equals");

  // Verify corresponding widgets for select operators
  expect(config.types.select.widgets.multiselect.operators).toContain("select_any_in");
  expect(config.types.select.widgets.multiselect.operators).toContain("select_not_any_in");

  // Important to verify that select_equals and select_not_equals are not present in multiselect as that might cause multiselect widget operand to show up for these operators
  expect(config.types.select.widgets.multiselect.operators).not.toContain("select_equals");
  expect(config.types.select.widgets.multiselect.operators).not.toContain("select_not_equals");

  expect(config.types.select.widgets.select.operators).toContain("select_equals");
  expect(config.types.select.widgets.select.operators).toContain("select_not_equals");

  // Important to verify that select_any_in and select_not_any_in are not present in select as that might cause select widget operand to show up for these operators
  expect(config.types.select.widgets.select.operators).not.toContain("select_any_in");
  expect(config.types.select.widgets.select.operators).not.toContain("select_not_any_in");
};

const assertMaxNesting = (config: any, value: number) => {
  expect(config.settings.maxNesting).toBe(value);
};

describe("Query Builder Config", () => {
  describe("FormFieldsBaseConfig", () => {
    it("should have the correct structure", () => {
      assertCommonStructure(FormFieldsBaseConfig);
    });

    it("should not support multiselect_some_in and multiselect_not_some_in - because they are not supported in Prisma for reporting(probably)", () => {
      expect(FormFieldsBaseConfig.types.multiselect.widgets.multiselect.operators).not.toContain(
        "multiselect_some_in"
      );
      expect(FormFieldsBaseConfig.types.multiselect.widgets.multiselect.operators).not.toContain(
        "multiselect_not_some_in"
      );
    });

    it("should support select_any_in, select_not_any_in, select_equals, select_not_equals - Verify both types.widgets and operators", () => {
      assertSelectOperators(FormFieldsBaseConfig);
    });

    it("should have specific widget types", () => {
      assertCommonWidgetTypes(FormFieldsBaseConfig);
    });

    it("should have maxNesting set to 1 in settings", () => {
      assertMaxNesting(FormFieldsBaseConfig, 1);
    });
  });

  describe("AttributesBaseConfig", () => {
    it("should have the correct structure", () => {
      assertCommonStructure(AttributesBaseConfig);
    });

    it("should support multiselect_some_in and multiselect_not_some_in operators for multiselect", () => {
      expect(AttributesBaseConfig.types.multiselect.widgets.multiselect.operators).toContain(
        "multiselect_some_in"
      );
      expect(AttributesBaseConfig.types.multiselect.widgets.multiselect.operators).toContain(
        "multiselect_not_some_in"
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const jsonLogic = AttributesBaseConfig.operators.multiselect_some_in.jsonLogic(
        ["A"],
        "multiselect_some_in",
        ["A", "B"]
      );

      // Verifies that it is using some-in implementation
      expect(jsonLogic).toEqual({
        some: [["A"], { in: [{ var: "" }, ["A", "B"]] }],
      });
    });

    it("should support select_any_in, select_not_any_in, select_equals, select_not_equals - Verify both types.widgets and operators", () => {
      assertSelectOperators(AttributesBaseConfig);
    });

    it("should have specific widget types", () => {
      assertCommonWidgetTypes(AttributesBaseConfig);
    });

    it("should have maxNesting set to 1 in settings", () => {
      assertMaxNesting(AttributesBaseConfig, 1);
    });

    it("should provide jsonlogic for between operator", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const jsonLogic = AttributesBaseConfig.operators.between.jsonLogic(
        { var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" },
        "between",
        ["1", "5"]
      );

      // Verifies that it is using >= and <= in implementation and integer parsed
      expect(jsonLogic).toEqual({
        and: [
          { ">=": [{ var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" }, 1] },
          { "<=": [{ var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" }, 5] },
        ],
      });
    });

    it("should provide jsonlogic for not_between operator", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const jsonLogic = AttributesBaseConfig.operators.not_between.jsonLogic(
        { var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" },
        "not_between",
        ["1", "5"]
      );

      // Verifies that it is using < and > in implementation and integer parsed
      expect(jsonLogic).toEqual({
        or: [
          { "<": [{ var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" }, 1] },
          { ">": [{ var: "89ee81ae-953c-409b-aacc-700e1ce5ae20" }, 5] },
        ],
      });
    });
  });
});
