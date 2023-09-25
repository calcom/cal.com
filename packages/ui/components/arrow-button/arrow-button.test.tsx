import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { ArrowButton } from "./ArrowButton";

describe("Tests for Arrow Button Component", () => {
  const onClick = vi.fn();
  test("should render the arrow up button", () => {
    render(<ArrowButton onClick={onClick} arrowDirection="up" />);
    expect(screen.getByTestId("arrow-up")).toBeInTheDocument();
  });

  test("should render the arrow down button", () => {
    render(<ArrowButton onClick={onClick} arrowDirection="down" />);
    expect(screen.getByTestId("arrow-down")).toBeInTheDocument();
  });

  test("Should call onClick callback when clicked", () => {
    render(<ArrowButton onClick={onClick} arrowDirection="up" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
