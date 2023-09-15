/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

import { Plus } from "@calcom/ui/components/icon";

import { Button, buttonClasses } from "./Button";

const observeMock = vi.fn();

window.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: observeMock,
  unobserve: vi.fn(),
}));

vi.mock("../tooltip", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = (await vi.importActual("../tooltip")) as any;
  const TooltipMock = (props: object) => {
    const [open, setOpen] = useState(false);

    return (
      <actual.Tooltip
        {...props}
        open={open}
        onOpenChange={(isOpen: boolean) => {
          setOpen(isOpen);
        }}
      />
    );
  };
  return {
    Tooltip: TooltipMock,
  };
});

describe("Tests for Button component", () => {
  test("Should apply the icon variant class", () => {
    render(<Button variant="icon">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ variant: "icon" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the fab variant class", () => {
    render(<Button variant="fab">Test Button</Button>);
    expect(screen.getByText("Test Button")).toHaveClass("hidden md:inline");
  });

  test("Should apply the secondary color class", () => {
    render(<Button color="secondary">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ color: "secondary" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the minimal color class", () => {
    render(<Button color="minimal">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ color: "minimal" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the sm size class", () => {
    render(<Button size="sm">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ size: "sm" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the base size class", () => {
    render(<Button size="base">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ size: "base" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the lg size class", () => {
    render(<Button size="lg">Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ size: "lg" });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the loading class", () => {
    render(<Button loading>Test Button</Button>);
    const buttonClass = screen.getByText("Test Button");
    const buttonComponentClass = buttonClasses({ loading: true });
    const buttonClassArray = buttonClass.className.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the disabled class when disabled prop is true", () => {
    render(<Button disabled>Test Button</Button>);
    const buttonClass = screen.getByText("Test Button").className;
    const expectedClassName = "disabled:cursor-not-allowed";
    expect(buttonClass.includes(expectedClassName)).toBe(true);
  });

  test("Should apply the custom class", () => {
    const className = "custom-class";
    render(<Button className={className}>Test Button</Button>);
    expect(screen.getByText("Test Button")).toHaveClass(className);
  });

  test("Should render as a button by default", () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByText("Test Button");
    expect(button.tagName).toBe("BUTTON");
  });

  test("Should render StartIcon and Plus icon if is fab variant", () => {
    render(
      <Button variant="fab" StartIcon={Plus} data-testid="start-icon">
        Test Button
      </Button>
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    expect(screen.getByTestId("plus")).toBeInTheDocument();
  });

  test("Should render just StartIcon if is not fab variant", () => {
    render(
      <Button StartIcon={Plus} data-testid="start-icon">
        Test Button
      </Button>
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("plus")).not.toBeInTheDocument();
  });

  test("Should render EndIcon and Plus icon if is fab variant", () => {
    render(
      <Button variant="fab" EndIcon={Plus} data-testid="end-icon">
        Test Button
      </Button>
    );
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    expect(screen.getByTestId("plus")).toBeInTheDocument();
  });

  test("Should render just EndIcon if is not fab variant", () => {
    render(
      <Button EndIcon={Plus} data-testid="end-icon">
        Test Button
      </Button>
    );
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("plus")).not.toBeInTheDocument();
  });

  test("Should render Link if have href", () => {
    render(<Button href="/test">Test Button</Button>);

    const buttonElement = screen.getByText("Test Button");

    expect(buttonElement).toHaveAttribute("href", "/test");
    expect(buttonElement.closest("a")).toBeInTheDocument();

    test("Should render Wrapper if don't have href", () => {
      render(<Button>Test Button</Button>);
      expect(screen.queryByTestId("link-component")).not.toBeInTheDocument();
      expect(screen.getByText("Test Button")).toBeInTheDocument();
    });

    test("Should render Tooltip if exists", () => {
      render(<Button tooltip="Hi, Im a tooltip">Test Button</Button>);
      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip.getAttribute("data-state")).toEqual("closed");
      expect(tooltip.getAttribute("data-state")).toEqual("instant-open");
      expect(observeMock).toBeCalledWith(tooltip);
    });
    test("Should not render Tooltip if no exists", () => {
      render(<Button>Test Button</Button>);
      expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
      expect(screen.getByText("Test Button")).toBeInTheDocument();
    });

    test("Should render as a button with a custom type", () => {
      render(<Button type="submit">Test Button</Button>);
      const button = screen.getByText("Test Button");
      expect(button.tagName).toBe("BUTTON");
      expect(button).toHaveAttribute("type", "submit");
    });

    test("Should render as an anchor when href prop is provided", () => {
      render(<Button href="/path">Test Button</Button>);
      const button = screen.getByText("Test Button");
      expect(button.tagName).toBe("A");
      expect(button).toHaveAttribute("href", "/path");
    });

    test("Should call onClick callback when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Test Button</Button>);
      const button = screen.getByText("Test Button");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test("Should render default button correctly", () => {
      render(<Button loading={false}>Default Button</Button>);
      const buttonClass = screen.getByText("Default Button").className;
      const buttonComponentClass = buttonClasses({ variant: "button", color: "primary", size: "base" });
      const buttonClassArray = buttonClass.split(" ");
      const hasMatchingClassNames = buttonComponentClass
        .split(" ")
        .every((className) => buttonClassArray.includes(className));
      expect(hasMatchingClassNames).toBe(true);
      expect(screen.getByText("Default Button")).toHaveAttribute("type", "button");
    });

    test("Should pass the shallow prop to Link component when href prop is passed", () => {
      const href = "https://example.com";
      render(<Button href={href} shallow />);

      const linkComponent = screen.getByTestId("link-component");
      expect(linkComponent).toHaveAttribute("shallow", "true");
    });
  });
});
