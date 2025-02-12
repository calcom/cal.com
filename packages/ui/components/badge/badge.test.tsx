import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { Icon } from "../icon";
import { Badge, badgeStyles } from "./Badge";

describe("Badge", () => {
  const variants = [
    "default",
    "warning",
    "orange",
    "success",
    "green",
    "gray",
    "blue",
    "red",
    "error",
    "grayWithoutHover",
    "purple",
  ] as const;

  const children = "Test Badge";

  test.each(variants)("renders %s variant correctly", (variant) => {
    render(<Badge variant={variant}>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge.className).toContain(badgeStyles({ variant }));
  });

  test("renders with default props", () => {
    render(<Badge>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("DIV");
  });

  test("renders with dot when withDot prop is true", () => {
    render(<Badge withDot>{children}</Badge>);
    expect(screen.getByTestId("go-primitive-dot")).toBeInTheDocument();
  });

  test("renders with startIcon when provided", () => {
    render(<Badge startIcon="info">{children}</Badge>);
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
  });

  test("renders with customStartIcon when provided", () => {
    render(<Badge customStartIcon={<Icon name="info" data-testid="custom-icon" />}>{children}</Badge>);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  test("renders as button with onClick handler", () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>{children}</Badge>);
    const badge = screen.getByText(children);

    expect(badge.tagName).toBe("BUTTON");
    fireEvent.click(badge);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("renders with rounded style when rounded prop is true", () => {
    render(<Badge rounded>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge.className).toContain("h-5 w-5 rounded-full p-0");
  });

  test("renders with additional className when provided", () => {
    const customClass = "custom-class";
    render(<Badge className={customClass}>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge.className).toContain(customClass);
  });

  test("renders nested children correctly", () => {
    render(
      <Badge>
        <span data-testid="child-1">Child 1</span>
        <span data-testid="child-2">Child 2</span>
      </Badge>
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });
});
