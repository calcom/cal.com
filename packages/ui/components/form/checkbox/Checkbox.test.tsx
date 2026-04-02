import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import { CheckboxField } from "./Checkbox";

const basicProps = { label: "Test Label", description: "Test Description" };

describe("Tests for CheckboxField component", () => {
  test("Should render the label and the description correctly", () => {
    const { getByText } = render(<CheckboxField {...basicProps} />);

    const labelElement = getByText("Test Label");
    expect(labelElement).toBeInTheDocument();

    const descriptionElement = getByText("Test Description");
    expect(descriptionElement).toBeInTheDocument();
  });

  test("Should render the description correctly when the prop descriptionAsLabel is true", () => {
    const { getByText } = render(<CheckboxField {...basicProps} descriptionAsLabel />);

    const descriptionElement = getByText("Test Label");
    expect(descriptionElement).toBeInTheDocument();
  });

  test("Should trigger onChange event correctly", () => {
    const handleChange = vi.fn();
    const { getByRole } = render(<CheckboxField {...basicProps} onChange={handleChange} />);

    const checkboxInput = getByRole("checkbox");

    fireEvent.click(checkboxInput);

    expect(handleChange).toHaveBeenCalled();
  });
  test("Should disable the checkbox when disabled prop is true", () => {
    const { getByRole } = render(<CheckboxField {...basicProps} disabled />);

    const checkboxInput = getByRole("checkbox");
    expect(checkboxInput).toBeDisabled();
  });

  test("Should change the checked state when clicked", () => {
    const { getByRole } = render(<CheckboxField {...basicProps} disabled />);
    const checkboxInput = getByRole("checkbox");

    expect(checkboxInput).not.toBeChecked();
    expect(checkboxInput).toBeTruthy();

    fireEvent.click(checkboxInput);

    expect(checkboxInput).toBeChecked();
    expect(checkboxInput).toBeTruthy();

    fireEvent.click(checkboxInput);

    expect(checkboxInput).not.toBeChecked();
  });
});
