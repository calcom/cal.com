/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { ArrowUp } from "lucide-react";
import { vi } from "vitest";

import { EmptyScreen } from "./EmptyScreen";

describe("Tests for Empty Screen", () => {
  test("should render empty screen component", () => {
    render(<EmptyScreen headline="Empty Headline" />);
    expect(screen.getByTestId("empty-screen")).toBeInTheDocument();
  });

  test("should render EmptyScreen component correctly", () => {
    const click = vi.fn();
    render(
      <EmptyScreen
        headline="Empty Headline"
        Icon={ArrowUp}
        border={true}
        dashedBorder={true}
        buttonText="Button Text"
        buttonOnClick={click}
      />
    );
    const button = screen.getByText("Button Text");
    fireEvent.click(button);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
