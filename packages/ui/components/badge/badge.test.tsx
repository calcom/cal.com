/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { Badge, badgeStyles } from "./Badge";

describe("Tests for Badge component", () => {
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
  ];

  const sizes = ["sm", "md", "lg"];
  const children = "Test Badge";

  test.each(variants)("Should apply variant class", (variant) => {
    render(<Badge variant={variant as any}>{children}</Badge>);
    const badgeClass = screen.getByText(children).className;
    const badgeComponentClass = badgeStyles({ variant: variant as any });
    expect(badgeClass).toEqual(badgeComponentClass);
  });

  test.each(sizes)("Should apply size class", (size) => {
    render(<Badge size={size as any}>{children}</Badge>);
    const badgeClass = screen.getByText(children).className;
    const badgeComponentClass = badgeStyles({ size: size as any });
    expect(badgeClass).toEqual(badgeComponentClass);
  });

  test("Should render without errors", () => {
    render(<Badge>{children}</Badge>);
    expect(screen.getByText(children)).toBeInTheDocument();
  });

  test("Should render WithDot if the prop is true and shouldn't render if is false", () => {
    const { rerender } = render(<Badge withDot>{children}</Badge>);
    expect(screen.getByTestId("go-primitive-dot")).toBeInTheDocument();

    rerender(<Badge>{children}</Badge>);
    expect(screen.queryByTestId("go-primitive-dot")).not.toBeInTheDocument();
  });

  test("Should render with a startIcon when startIcon prop is provided shouldn't render if is false", () => {
    const startIcon = () => <svg data-testid="start-icon" />;
    const { rerender } = render(<Badge startIcon={startIcon}>{children}</Badge>);
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();

    rerender(<Badge>{children}</Badge>);
    expect(screen.queryByTestId("start-icon")).not.toBeInTheDocument();
  });

  test("Should render as a button when onClick prop is provided and shouldn't if is not", () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Badge onClick={handleClick}>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge.tagName).toBe("BUTTON");
    fireEvent.click(badge);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Badge>{children}</Badge>);
    const updateBadge = screen.getByText(children);
    expect(updateBadge.tagName).not.toBe("BUTTON");
  });

  test("Should render as a div when onClick prop is not provided", () => {
    render(<Badge>{children}</Badge>);
    const badge = screen.getByText(children);
    expect(badge.tagName).toBe("DIV");
  });

  test("Should render children when provided", () => {
    const { getByText } = render(
      <Badge>
        <span>Child element 1</span>
        <span>Child element 2</span>
      </Badge>
    );

    expect(getByText("Child element 1")).toBeInTheDocument();
    expect(getByText("Child element 2")).toBeInTheDocument();
  });
});
