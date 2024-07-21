import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

import { useShouldBeDisabledDueToPrefill } from "@calcom/lib/hooks/useShouldBeDisabledDueToPrefill";

import type { RhfFormField } from "./utils";

// Mock dependencies
vi.mock("@hookform/error-message", () => ({ ErrorMessage: () => null }));
vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: () => ({
    "test-email-n": "test123@gmail", // Mock search params
    "test-phone-n": "+919951881732", // Mock search params
    "test-address-n": "test123", // Mock search params
    "test-text-n": "test123", // Mock search params
    "test-textarea-n": "test123", // Mock search params
    "test-select-n": "Option 1", // Mock search params
    "test-multiselect-n": "Option 1", // Mock search params
    "test-multiemail-n": "test12345@gmail.com", // Mock search params
    "test-radio-n": "Option 1", // Mock search params
    "test-boolean-n": "true", // Mock search params
    "test-checkbox-n": "Option 1", // Mock search params
    "test-number-n": 123, // Mock search params
  }),
}));

const questionTypes = [
  { questionType: "email", label: "Email Field" },
  { questionType: "phone", label: "Phone Field" },
  { questionType: "address", label: "Address Field" },
  { questionType: "text", label: "Short Text Field" },
  { questionType: "number", label: "Number Field" },
  { questionType: "textarea", label: "Long Text Field" },
  { questionType: "select", label: "Select Field" },
  { questionType: "multiselect", label: "MultiSelect Field" },
  { questionType: "multiemail", label: "Multiple Emails Field" },
  { questionType: "checkbox", label: "CheckBox Group Field" },
  { questionType: "radio", label: "Radio Group Field" },
  { questionType: "boolean", label: "Checkbox Field" },
];

const getFormatStateForQuestionType = (questionType: string) => {
  return {
    errors: {
      responses: {
        message: `{test-${questionType}-n}Testing the error case for type ${questionType}`,
      },
    },
  };
};

// Mock `react-hook-form` module
vi.mock("react-hook-form", async () => {
  const actual: any = await vi.importActual("react-hook-form");
  return {
    ...actual,
    useFormContext: vi.fn().mockReturnValue({
      control: {} as Control, // Mock Control object
      formState: {} as any, // Mock formState object
    }),
  };
});

describe("FormBuilderField: Disable on Prefill Behavior", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  for (const { questionType, label } of questionTypes) {
    test(`should remain enabled when 'disableOnPrefill' is true and there are errors for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: true,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        required: true,
      } as RhfFormField;
      const formState = getFormatStateForQuestionType(questionType);
      const mockFormContext = { formState, control: {} as Control };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(false);
    });
  }
  for (const { questionType, label } of questionTypes) {
    test(`should remain enabled when 'disableOnPrefill' is false for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: false,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        required: true,
      } as RhfFormField;

      const formState = getFormatStateForQuestionType(questionType);
      const mockFormContext = { formState, control: {} as Control };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(false);
    });
  }
  for (const { questionType, label } of questionTypes) {
    test(`should be disabled when 'disableOnPrefill' is true and there are no errors for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: true,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        required: true,
      } as RhfFormField;
      //no errors
      const formState = {};
      const mockFormContext = { formState, control: {} as Control };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(true);
    });
  }
});
