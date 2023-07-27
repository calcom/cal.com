/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import TokenHandler from "./TokenHandler";

describe("Tests for TokenHandler component", () => {
  test("Should render the correct number of input elements", () => {
    const digits = [
      { value: 1, onChange: vi.fn() },
      { value: 2, onChange: vi.fn() },
      { value: 3, onChange: vi.fn() },
    ];

    render(<TokenHandler digits={digits} digitClassName="digit" />);
    expect(screen.getAllByRole("textbox")).toHaveLength(digits.length);
  });

  test("Should handle digit input correctly", () => {
    const onChangeMock = vi.fn();
    const digits = [{ value: 1, onChange: onChangeMock }];

    render(<TokenHandler digits={digits} digitClassName="digit" />);

    const inputElement = screen.getByRole("textbox");
    fireEvent.change(inputElement, { target: { value: "5" } });

    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});
