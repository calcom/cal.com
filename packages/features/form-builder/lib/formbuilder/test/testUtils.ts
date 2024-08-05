import { fireEvent, waitFor, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { z } from "zod";

import type { fieldsSchema } from "@calcom/features/form-builder/schema";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];

export type RhfFormField = RhfFormFields[number];

export type FieldType = RhfFormField["type"];
export interface QuestionProps {
  questionType: string;
  identifier: string;
  label: string;
  disableOnPrefill?: boolean;
}

export interface FormBuilderProps {
  formProp: string;
  title: string;
  description: string;
  addFieldLabel: string;
  disabled: boolean;
  LockedIcon: false | JSX.Element;
  dataStore: {
    options: Record<string, { label: string; value: string; inputPlaceholder?: string }[]>;
  };
  disableOnPrefill?: boolean;
}

export interface FormBuildFieldProps {
  field: Omit<RhfFormField, "editable" | "label"> & {
    // Label is optional because radioInput doesn't have a label
    label?: string;
    value: string;
  };
  readOnly: boolean;
}

export const mockProps: FormBuilderProps = {
  formProp: "formProp",
  title: "FormBuilder Title",
  description: "FormBuilder Description",
  addFieldLabel: "Add Field",
  disabled: false,
  LockedIcon: false,
  dataStore: { options: {} },
  disableOnPrefill: false,
};

export const mockFieldProps: FormBuildFieldProps = {
  field: {
    type: "text",
    name: "test-text-n",
    variant: "text",
    placeholder: "text-test-p",
    required: false,
    label: "text-test-l",
    disableOnPrefill: false,
    value: "",
  },
  readOnly: false,
};

export const setMockMatchMedia = () => {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

export const setMockIntersectionObserver = () => {
  Object.defineProperty(window, "IntersectionObserver", {
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    })),
  });
};

export const clickDisablePrefillBasedOnUserInput = (disableOnPrefill?: boolean) => {
  if (typeof disableOnPrefill === "boolean") {
    // Get the checkbox element
    const checkbox = getDisablePrefillCheckbox(disableOnPrefill) as HTMLInputElement;

    // Determine if the checkbox's current state differs from the `disableOnPrefill` prop
    const isChecked = checkbox ? checkbox.checked : false;

    // Click the checkbox only if its current state differs from the `disableOnPrefill` value
    if (isChecked !== disableOnPrefill) {
      fireEvent.click(checkbox);
    }
  }
};

export const getDisablePrefillCheckbox = (disableOnPrefill?: boolean) => {
  if (typeof disableOnPrefill === "boolean") {
    const checkbox = screen.getByRole("checkbox", { name: /disable_input_if_prefilled/i });
    return checkbox;
  }
};

export const checkForDisablePreFillCheckox = (disableOnPrefill?: boolean) => {
  const checkbox = getDisablePrefillCheckbox(disableOnPrefill);
  expect(checkbox).toBeInTheDocument();
};

export const questionUtils = {
  addQuestion: async (props: QuestionProps) => {
    fireEvent.click(screen.getByTestId("add-field"));
    checkForDisablePreFillCheckox(props?.disableOnPrefill);
    fireEvent.keyDown(screen.getByTestId("test-field-type"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(screen.getByTestId(`select-option-${props.questionType}`));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: props.identifier } });
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: props.label } });
    clickDisablePrefillBasedOnUserInput(props?.disableOnPrefill);
    fireEvent.click(screen.getByTestId("field-add-save"));
    await waitFor(() => {
      expect(screen.queryByTestId(`field-${props.identifier}`)).toBeInTheDocument();
    });
  },
  editQuestion: async (props: {
    identifier: string;
    existingQuestionId: string;
    disableOnPrefill?: boolean;
  }) => {
    fireEvent.click(screen.getByTestId("edit-field-action"));
    checkForDisablePreFillCheckox(props?.disableOnPrefill);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: props.identifier } });
    clickDisablePrefillBasedOnUserInput(props?.disableOnPrefill);

    fireEvent.click(screen.getByTestId("field-add-save"));

    await waitFor(() => {
      expect(screen.queryByTestId(`field-${props.identifier}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`field-${props.existingQuestionId}`)).not.toBeInTheDocument();
    });
  },
  deleteQuestion: async (existingQuestionId: string) => {
    expect(screen.queryByTestId(`field-${existingQuestionId}`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("delete-field-action"));

    await waitFor(() => {
      expect(screen.queryByTestId(`field-${existingQuestionId}`)).not.toBeInTheDocument();
    });
  },
  hideQuestion: async () => {
    fireEvent.click(screen.getByTestId("toggle-field"));

    await waitFor(() => {
      expect(screen.queryByText(/hidden/i)).toBeInTheDocument();
    });
  },
  requiredAndOptionalQuestion: async () => {
    expect(screen.queryByTestId("required")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("edit-field-action"));
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByTestId("field-add-save"));

    await waitFor(() => {
      expect(screen.getByTestId("optional")).toBeInTheDocument();
    });
  },
  expectedValueForDisablePreFillCheckox: async (expectedValue: boolean) => {
    fireEvent.click(screen.getByTestId("edit-field-action"));
    const checkbox = getDisablePrefillCheckbox(expectedValue) as HTMLInputElement;
    await expect(checkbox?.checked).toBe(expectedValue);
  },
};
