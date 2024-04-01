import { fireEvent, waitFor, screen } from "@testing-library/react";
import { vi } from "vitest";

export interface QuestionProps {
  questionType: string;
  identifier: string;
  label: string;
}

interface FormBuilderProps {
  formProp: string;
  title: string;
  description: string;
  addFieldLabel: string;
  disabled: boolean;
  LockedIcon: false | JSX.Element;
  dataStore: {
    options: Record<string, { label: string; value: string; inputPlaceholder?: string }[]>;
  };
}

export const mockProps: FormBuilderProps = {
  formProp: "formProp",
  title: "FormBuilder Title",
  description: "FormBuilder Description",
  addFieldLabel: "Add Field",
  disabled: false,
  LockedIcon: false,
  dataStore: { options: {} },
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

export const questionUtils = {
  addQuestion: async (props: QuestionProps) => {
    fireEvent.click(screen.getByTestId("add-field"));
    fireEvent.keyDown(screen.getByTestId("test-field-type"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(screen.getByTestId("select-option-email"));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: props.identifier } });
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: props.label } });
    fireEvent.click(screen.getByTestId("field-add-save"));

    await waitFor(() => {
      expect(screen.queryByTestId(`field-${props.identifier}`)).toBeInTheDocument();
    });
  },
  editQuestion: async (props: { identifier: string; existingQuestionId: string }) => {
    fireEvent.click(screen.getByTestId("edit-field-action"));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: props.identifier } });
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
};
