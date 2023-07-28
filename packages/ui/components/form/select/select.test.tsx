/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Select, SelectField, SelectWithValidation } from "./Select";

const options = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" },
  { label: "Option 3", value: "option3" },
];

const onChangeMock = vi.fn();

let props: any = {
  name: "test",
  options: options,
  defaultValue: { label: "Option 3", value: "option3" },
  onChange: onChangeMock,
};

const renderSelectWithForm = () => {
  render(
    <form aria-label="test form">
      <label htmlFor="test">Test</label>
      <Select {...props} inputId="test" />
      <p>Click Outside</p>
    </form>
  );
};

const selectOption = async (optionText: any) => {
  const element = screen.getByLabelText("Test");
  element.focus();
  fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
  screen.getByText(optionText);
  const option = screen.getByText(optionText);
  fireEvent.click(option);
};

describe("Tests for Select File", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tests for Select component", () => {
    beforeEach(() => {
      renderSelectWithForm();
    });

    test("Should render with the correct default value", () => {
      expect(screen.getByText("Option 3")).toBeInTheDocument();
      expect(screen.getByRole("form")).toHaveFormValues({ test: "option3" });
    });

    test("Should select and have the correct value after selection of an option", async () => {
      await waitFor(async () => {
        await selectOption("Option 2");
      });

      expect(onChangeMock).toHaveBeenCalled();
      expect(screen.getByRole("form")).toHaveFormValues({ test: "option2" });
    });

    test("Should keep the default value after selections are shown and the user clicks outside the selection element", async () => {
      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });

        screen.getByText("Option 2");
        const outsideButton = screen.getByText("Click Outside");
        fireEvent.click(outsideButton);
      });

      expect(screen.getByRole("form")).toHaveFormValues({ test: "option3" });
    });

    test("Should keep the selected value after the user has selected an option and clicked out of the selection element", async () => {
      await waitFor(async () => {
        await selectOption("Option 2");
        const outsideButton = screen.getByText("Click Outside");
        fireEvent.click(outsideButton);
      });

      expect(screen.getByRole("form")).toHaveFormValues({ test: "option2" });
    });
  });

  describe("Tests for SelectField component", () => {
    const renderSelectField = () => {
      render(
        <form aria-label="test form">
          <SelectField {...props} />
        </form>
      );
    };

    test("Should not render the label element when not passed", () => {
      renderSelectField();
      expect(() => screen.getByLabelText("Test SelectField")).toThrow();
    });

    test("Should render with the default value and label", () => {
      props = { ...props, label: "Test SelectField" };
      renderSelectField();

      expect(screen.getByText("Option 3")).toBeInTheDocument();
      expect(screen.getByRole("form")).toHaveFormValues({ test: "option3" });

      const labelElement = screen.getByText("Test SelectField");
      expect(labelElement).toBeInTheDocument();
    });
  });

  describe("Tests for SelectWithValidation component", () => {
    const renderSelectWithValidation = (required: boolean) => {
      render(
        <form aria-label="test form">
          <SelectWithValidation {...props} required={required} />
        </form>
      );
    };
    test("Should render with the default value", () => {
      renderSelectWithValidation(true);

      expect(screen.getByText("Option 3")).toBeInTheDocument();
      expect(screen.getByRole("form")).toHaveFormValues({ test: "option3" });
    });

    test("Should render an input element with the value passed as prop", () => {
      renderSelectWithValidation(false);
      expect(screen.getAllByDisplayValue("option3")).toHaveLength(1);
    });
  });
});
