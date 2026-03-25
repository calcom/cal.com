import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";
import ColorPicker from "./colorpicker";

function getColorSwatch() {
  const button = screen.getByRole("button", { name: "pick colors" });
  const swatch = button.querySelector("span");
  return { button, swatch: swatch! };
}

describe("Tests for ColorPicker component", () => {
  test("Should render the color picker with a given default value", () => {
    const defaultValue = "#FF0000";
    const onChange = vi.fn();
    render(<ColorPicker defaultValue={defaultValue} onChange={onChange} />);

    const { swatch } = getColorSwatch();
    expect(swatch).toHaveStyle(`background-color: ${defaultValue}`);
  });

  test("Should select a new color using the color picker", async () => {
    const defaultValue = "#FF0000";
    const onChange = vi.fn();
    render(<ColorPicker defaultValue={defaultValue} onChange={onChange} />);

    const { button, swatch } = getColorSwatch();
    await act(async () => {
      fireEvent.click(button);
    });
    const colorPickerInput = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(colorPickerInput, { target: { value: "#000000" } });
    });

    await waitFor(() => {
      expect(swatch).toHaveStyle("background-color: #000000");
    });
  });

  test("Should change the color value using the input field", async () => {
    const onChange = vi.fn();
    const defaultValue = "#FF0000";
    render(<ColorPicker defaultValue={defaultValue} onChange={onChange} />);

    const colorInput = screen.getByRole("textbox");
    await act(async () => userEvent.clear(colorInput));
    const newColorValue = "#00FF00";
    await act(async () => await userEvent.type(colorInput, newColorValue));
    const { swatch } = getColorSwatch();
    expect(swatch).toHaveStyle(`background-color: ${newColorValue}`);
  });

  test("Should not change the color value when an invalid HEX value is entered", async () => {
    const defaultValue = "#FF0000";
    const onChange = vi.fn();

    render(<ColorPicker defaultValue={defaultValue} onChange={onChange} />);

    const { button, swatch } = getColorSwatch();
    await act(async () => {
      fireEvent.click(button);
    });
    const colorPickerInput = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(colorPickerInput, { target: { value: "#FF0000240" } });
    });
    expect(swatch).toHaveStyle(`background-color: ${defaultValue}`);
  });

  test("Should reset the color to default when clicking on the reset button", async () => {
    const defaultValue = "#FF0000";
    const resetDefaultValue = "#00FF00";
    const onChange = vi.fn();

    render(
      <ColorPicker defaultValue={defaultValue} resetDefaultValue={resetDefaultValue} onChange={onChange} />
    );

    const { button } = getColorSwatch();
    await act(async () => {
      fireEvent.click(button);
    });
    const colorPickerInput = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(colorPickerInput, { target: { value: "#000000" } });
    });

    const resetButton = screen.getByRole("button", { name: "Reset to default" });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    const { swatch } = getColorSwatch();
    expect(swatch).toHaveStyle(`background-color: ${resetDefaultValue}`);

    expect(onChange).toHaveBeenCalledWith(resetDefaultValue);
  });

  test("Should not show the reset button when resetDefaultValue prop is not provided", async () => {
    const defaultValue = "#FF0000";
    const onChange = vi.fn();

    render(<ColorPicker defaultValue={defaultValue} onChange={onChange} />);

    const resetButton = screen.queryByRole("button", { name: "Reset to default" });
    expect(resetButton).not.toBeInTheDocument();
  });
});
