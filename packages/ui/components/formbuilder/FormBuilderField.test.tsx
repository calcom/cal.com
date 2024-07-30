import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { describe, expect, vi } from "vitest";

import { checkParseQueryValues } from "@calcom/features/bookings/Booker/components/hooks/useInitialFormValues";
import { useShouldBeDisabledDueToPrefill } from "@calcom/features/form-builder/FormBuilderField";

import type { RhfFormField } from "./testUtils";

// Mock dependencies
vi.mock("@hookform/error-message", () => ({ ErrorMessage: () => null }));

//positive and negativev test cases
const multiOptionsFieldSearchParams = {
  "test-multiselect-p-n": ["Option 1", "Option 2"], // Mock search params
  "test-multiselect-n-n": ["Option 1", "Option 3"], // Mock search params
  "test-checkbox-p-n": ["Option 1", "Option 2"], // Mock search params
  "test-checkbox-n-n": ["Option 1", "Option 3"], // Mock search params
  "test-multiemail-p-n": ["test123@gmail.com", "test1234@gmail.com"], // Mock search params

  "n-test-multiselect-p-n": "Option 3", // Mock search params
  "n-test-multiselect-n-n": ["Option 4", "Option 3"], // Mock search params
  "n-test-checkbox-p-n": "Option 3", // Mock search params
  "n-test-checkbox-n-n": ["Option 4", "Option 3"], // Mock search params
};

const searchParams = {
  "test-email-n": "test123@gmail", // Mock search params
  "test-phone-n": "+919952882732", // Mock search params
  "test-address-n": "test123", // Mock search params
  "test-text-n": "test123", // Mock search params
  "test-textarea-n": "test123", // Mock search params
  "test-select-n": "Option 1", // Mock search params
  "test-multiselect-n": "Option 1", // Mock search params
  "test-multiemail-n": "test12345@gmail.com", // Mock search params
  "test-radio-n": "Option 1", // Mock search params
  "test-boolean-n": "true", // Mock search params
  "test-checkbox-n": "Option 1", // Mock search params
  "test-number-n": "123", // Mock search params
  ...multiOptionsFieldSearchParams,
};

vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: () => ({ ...searchParams }),
}));

const options = [
  { label: "Option 1", value: "Option 1" },
  { label: "Option 2", value: "Option 2" },
];

const questionTypes = [
  { questionType: "email", label: "Email Field" },
  { questionType: "phone", label: "Phone Field" },
  { questionType: "address", label: "Address Field" },
  { questionType: "text", label: "Short Text Field" },
  { questionType: "number", label: "Number Field" },
  { questionType: "textarea", label: "Long Text Field" },
  { questionType: "select", label: "Select Field", options },
  { questionType: "radio", label: "Radio Group Field", options },
  { questionType: "boolean", label: "Checkbox Field", options },
];

const multiOptionsQuestions = [
  { questionType: "multiselect", label: "MultiSelect Field", options },
  { questionType: "multiemail", label: "Multiple Emails Field" },
  { questionType: "checkbox", label: "CheckBox Group Field", options },
];

const finalQuestionTypes = [...questionTypes, ...multiOptionsQuestions];

const buildFormStateWithError = (questionType: string) => {
  return {
    errors: {
      responses: {
        message: `{test-${questionType}-n}Testing the error case for type ${questionType}`,
      },
    },
  };
};

const getFormInitialValueForField = (
  field: RhfFormField,
  searchParams: Record<string, string | string[]>
) => {
  if (!searchParams) return {};
  const result = checkParseQueryValues(field, searchParams);
  if (result.success) {
    return { [field.name]: result.value };
  }

  return { [field.name]: undefined };
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

  for (const { questionType, label, options } of finalQuestionTypes) {
    test(`should return false when 'disableOnPrefill' is 'true' but there are errors for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: true,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        required: true,
        options,
      } as RhfFormField;
      const formState = buildFormStateWithError(questionType);
      const mockFormContext = {
        formState,
        control: {} as Control,
        getValues: () => ({
          responses: getFormInitialValueForField(field, searchParams),
        }),
      };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(false);
    });
  }
  for (const { questionType, label, options } of finalQuestionTypes) {
    test(`should return 'false' when 'disableOnPrefill' is 'false' for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: false,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        required: true,
        options,
      } as RhfFormField;

      const formState = buildFormStateWithError(questionType);
      const mockFormContext = {
        formState,
        control: {} as Control,
        getValues: () => ({
          responses: getFormInitialValueForField(field, searchParams),
        }),
      };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(false);
    });
  }
  for (const { questionType, label, options } of finalQuestionTypes) {
    test(`should return 'true' when 'disableOnPrefill' is true, there are no errors, and the URL search parameter
      value matches the form value for ${label} (${questionType})`, () => {
      const field = {
        value: "",
        disableOnPrefill: true,
        type: questionType,
        name: `test-${questionType}-n`,
        label: `test-${questionType}-l`,
        placeholder: `test-${questionType}-p`,
        options,
        required: true,
      } as RhfFormField;
      //no errors
      const formState = {};
      const formValues = getFormInitialValueForField(field, searchParams);
      const mockFormContext = {
        formState,
        control: {} as Control,
        getValues: () => ({
          responses: formValues,
        }),
      };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(true);
    });
  }

  for (const { questionType, label, options } of multiOptionsQuestions) {
    test(`should return 'true' when 'disableOnPrefill' is true and there is a match between the URL
       search parameter value and the form value for ${label} (${questionType})(positive case)`, () => {
      const field = {
        value: "",
        disableOnPrefill: true,
        type: questionType,
        name: `test-${questionType}-p-n`,
        label: `test-${questionType}-p-l`,
        placeholder: `test-${questionType}-p-p`,
        required: true,
        options,
      } as RhfFormField;
      //no errors
      const formState = {};
      const defaultValues = getFormInitialValueForField(field, searchParams);
      const mockFormContext = {
        formState,
        control: {} as Control,
        getValues: () => ({
          responses: defaultValues,
        }),
      };
      // Mock `useFormContext` for this specific test
      (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(true);
    });
  }

  for (const { questionType, label, options } of multiOptionsQuestions) {
    test(`should return 'true' when 'disableOnPrefill' is true and there is a mismatch between the URL
       search parameter value and the form value for ${label} (${questionType})(positive negative case)`, () => {
      if (questionType !== "multiemail") {
        const field = {
          value: "",
          disableOnPrefill: true,
          type: questionType,
          name: `test-${questionType}-n-n`,
          label: `test-${questionType}-n-l`,
          placeholder: `test-${questionType}-n-p`,
          required: true,
          options,
        } as RhfFormField;
        //no errors
        const formState = {};
        const defaultValues = getFormInitialValueForField(field, searchParams);
        const mockFormContext = {
          formState,
          control: {} as Control,
          getValues: () => ({
            responses: defaultValues,
          }),
        };
        // Mock `useFormContext` for this specific test
        (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      }
    });
  }

  for (const { questionType, label, options } of multiOptionsQuestions) {
    test(`should return 'false' when 'disableOnPrefill' is true and there is a mismatch between the URL
       search parameter value and the form value for ${label} (${questionType})(negative case)`, () => {
      if (questionType !== "multiemail") {
        const field = {
          value: "",
          disableOnPrefill: true,
          type: questionType,
          name: `n-test-${questionType}-p-n`,
          label: `n-test-${questionType}-p-l`,
          placeholder: `n-test-${questionType}-p-p`,
          required: true,
          options,
        } as RhfFormField;
        //no errors
        const formState = {};
        const defaultValues = getFormInitialValueForField(field, searchParams);
        const mockFormContext = {
          formState,
          control: {} as Control,
          getValues: () => ({
            responses: defaultValues,
          }),
        };
        // Mock `useFormContext` for this specific test
        (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(false);
      }
    });
  }

  for (const { questionType, label, options } of multiOptionsQuestions) {
    test(`should return 'false' when 'disableOnPrefill' is true and there is a mismatch between the URL
       search parameter value and the form value for ${label} (${questionType})(negative case 2)`, () => {
      if (questionType === "multiemail") {
        const field = {
          value: "",
          disableOnPrefill: true,
          type: questionType,
          name: `n-test-${questionType}-n-n`,
          label: `n-test-${questionType}-n-l`,
          placeholder: `n-test-${questionType}-n-p`,
          required: true,
          options,
        } as RhfFormField;
        //no errors
        const formState = {};
        const mockFormContext = {
          formState,
          control: {} as Control,
          getValues: () => ({
            responses: getFormInitialValueForField(field, searchParams),
          }),
        };
        // Mock `useFormContext` for this specific test
        (vi.mocked(useFormContext) as any).mockReturnValue(mockFormContext);
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(false);
      }
    });
  }
});
