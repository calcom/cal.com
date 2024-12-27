import type { Settings } from "react-awesome-query-builder";
import { describe, it, vi, expect } from "vitest";

import { withRaqbSettingsAndWidgets } from "../components/react-awesome-query-builder/config/uiConfig";

// Mock dependencies
vi.mock("../components/react-awesome-query-builder/widgets", () => ({
  default: {
    TextWidget: vi.fn(),
    TextAreaWidget: vi.fn(),
    MultiSelectWidget: vi.fn(),
    SelectWidget: vi.fn(),
    NumberWidget: vi.fn(),
    FieldSelect: vi.fn(),
    Conjs: vi.fn(),
    Button: vi.fn(),
    ButtonGroup: vi.fn(),
    Provider: vi.fn(),
  },
}));

vi.mock("@calcom/ui", () => ({
  EmailField: vi.fn(),
}));

describe("uiConfig", () => {
  const mockConfig = {
    widgets: {
      text: {},
      textarea: {},
      number: {},
      multiselect: {},
      select: {},
      phone: {},
      email: {},
    },
    settings: {} as Settings,
  };

  describe("withRaqbSettingsAndWidgets", () => {
    it("should add factory functions to all widgets", () => {
      const result = withRaqbSettingsAndWidgets({
        config: mockConfig,
        configFor: "form-fields",
      });

      // Verify each widget has a factory function
      expect(result.widgets.text).toHaveProperty("factory");
      expect(result.widgets.textarea).toHaveProperty("factory");
      expect(result.widgets.number).toHaveProperty("factory");
      expect(result.widgets.multiselect).toHaveProperty("factory");
      expect(result.widgets.select).toHaveProperty("factory");
      expect(result.widgets.phone).toHaveProperty("factory");
      expect(result.widgets.email).toHaveProperty("factory");
    });

    it("should add render functions to settings", () => {
      const result = withRaqbSettingsAndWidgets({
        config: mockConfig,
        configFor: "form-fields",
      });

      // Verify settings have all required render functions
      expect(result.settings).toHaveProperty("renderField");
      expect(result.settings).toHaveProperty("renderOperator");
      expect(result.settings).toHaveProperty("renderFunc");
      expect(result.settings).toHaveProperty("renderConjs");
      expect(result.settings).toHaveProperty("renderButton");
      expect(result.settings).toHaveProperty("renderButtonGroup");
      expect(result.settings).toHaveProperty("renderProvider");
    });

    it("should preserve existing widget properties while adding factory", () => {
      const configWithExistingProps = {
        ...mockConfig,
        widgets: {
          ...mockConfig.widgets,
          text: {
            existingProp: "value",
          },
        },
      };

      const result = withRaqbSettingsAndWidgets({
        config: configWithExistingProps,
        configFor: "form-fields",
      });

      expect(result.widgets.text).toHaveProperty("existingProp", "value");
      expect(result.widgets.text).toHaveProperty("factory");
    });

    it("should set correct placeholder for phone widget", () => {
      const result = withRaqbSettingsAndWidgets({
        config: mockConfig,
        configFor: "form-fields",
      });

      expect(result.widgets.phone).toHaveProperty("valuePlaceholder", "Enter Phone Number");
    });

    it("should reuse same component fns for widgets - ensures remounting is not happening", () => {
      const configWithExistingProps = {
        ...mockConfig,
      };

      const result = withRaqbSettingsAndWidgets({
        config: configWithExistingProps,
        configFor: "form-fields",
      });

      const textFactory = result.widgets.text.factory;

      const result2 = withRaqbSettingsAndWidgets({
        config: configWithExistingProps,
        configFor: "form-fields",
      });

      // Using same reference
      expect(result2.widgets.text.factory).toBe(textFactory);
    });

    it("should reuse same component fns for settings - ensures remounting is not happening", () => {
      const configWithExistingProps = {
        ...mockConfig,
      };

      const result1 = withRaqbSettingsAndWidgets({
        config: configWithExistingProps,
        configFor: "form-fields",
      });

      const renderFieldOnFirstCallOfWithRaqbSettingsAndWidgets = result1.settings.renderField;

      const result2 = withRaqbSettingsAndWidgets({
        config: configWithExistingProps,
        configFor: "form-fields",
      });

      expect(result2.settings.renderField).toBe(renderFieldOnFirstCallOfWithRaqbSettingsAndWidgets);
    });
  });
});
