/* eslint-disable playwright/missing-playwright-await */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { Button, buttonClasses } from "./Button";

type TooltipProps = {
  children: React.ReactNode;
  content?: React.ReactNode;
  [key: string]: unknown;
};

vi.mock("../tooltip/Tooltip", () => {
  return {
    Tooltip: (props: TooltipProps) => {
      const { children, content, ...rest } = props;
      if (content) {
        return (
          <div data-testid="tooltip" {...rest}>
            {children}
          </div>
        );
      }
      return <>{children}</>;
    },
    default: (props: TooltipProps) => {
      const { children, content, ...rest } = props;
      if (content) {
        return (
          <div data-testid="tooltip" {...rest}>
            {children}
          </div>
        );
      }
      return <>{children}</>;
    },
  };
});

// Helper to find the interactive control (button or link) by its visible text
const getInteractiveByText = (text: string): HTMLElement => {
  const byButton = screen.queryByRole("button", { name: text });
  if (byButton) return byButton;
  const byLink = screen.queryByRole("link", { name: text });
  if (byLink) return byLink;
  return screen.getByText(text);
};

const observeMock: ReturnType<typeof vi.fn> = vi.fn();

window.ResizeObserver = vi.fn().mockImplementation(function() {
  return {
    disconnect: vi.fn(),
    observe: observeMock,
    unobserve: vi.fn(),
  };
});

describe("Tests for Button component", () => {
  test("Should apply the icon variant class", () => {
    render(<Button variant="icon">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ variant: "icon" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the fab variant class", () => {
    render(<Button variant="fab">Test Button</Button>);
    const button = getInteractiveByText("Test Button");
    expect(button.className).toContain("md:min-w-min");
    expect(button.className).toContain("md:min-h-min");
  });

  test("Should apply the secondary color class", () => {
    render(<Button color="secondary">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ color: "secondary" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the minimal color class", () => {
    render(<Button color="minimal">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ color: "minimal" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the sm size class", () => {
    render(<Button size="sm">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ size: "sm" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the base size class", () => {
    render(<Button size="base">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ size: "base" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the lg size class", () => {
    render(<Button size="lg">Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ size: "lg" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the loading class", () => {
    render(<Button loading>Test Button</Button>);
    const buttonElement = getInteractiveByText("Test Button");
    const buttonClass = buttonElement.className;
    const buttonComponentClass = buttonClasses({ loading: true });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .some((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
  });

  test("Should apply the disabled class when disabled prop is true", () => {
    render(<Button disabled>Test Button</Button>);
    const buttonClass = getInteractiveByText("Test Button").className;
    const expectedClassName = "disabled:cursor-not-allowed";
    expect(buttonClass.includes(expectedClassName)).toBe(true);
  });

  test("Should apply the custom class", () => {
    const className = "custom-class";
    render(<Button className={className}>Test Button</Button>);
    expect(getInteractiveByText("Test Button")).toHaveClass(className);
  });

  test("Should render as a button by default", () => {
    render(<Button>Test Button</Button>);
    const button = getInteractiveByText("Test Button");
    expect(button.tagName).toBe("BUTTON");
  });

  test("Should render StartIcon and Plus icon if is fab variant", async () => {
    render(
      <Button variant="fab" StartIcon="plus" data-testid="start-icon">
        Test Button
      </Button>
    );
    expect(await screen.findByTestId("start-icon")).toBeInTheDocument();
    expect(await screen.findByTestId("plus")).toBeInTheDocument();
  });

  test("Should render just StartIcon if is not fab variant", async () => {
    render(
      <Button StartIcon="plus" data-testid="start-icon">
        Test Button
      </Button>
    );
    expect(await screen.findByTestId("start-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("plus")).not.toBeInTheDocument();
  });

  test("Should render EndIcon and Plus icon if is fab variant", async () => {
    render(
      <Button variant="fab" EndIcon="plus" data-testid="end-icon">
        Test Button
      </Button>
    );
    expect(await screen.findByTestId("end-icon")).toBeInTheDocument();
    expect(await screen.findByTestId("plus")).toBeInTheDocument();
  });

  test("Should render just EndIcon if is not fab variant", async () => {
    render(
      <Button EndIcon="plus" data-testid="end-icon">
        Test Button
      </Button>
    );
    expect(await screen.findByTestId("end-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("plus")).not.toBeInTheDocument();
  });
});

describe("Test for button as a link", () => {
  test("Should render Link if have href", () => {
    render(<Button href="/test">Test Button</Button>);

    const link = getInteractiveByText("Test Button");

    expect(link).toHaveAttribute("href", "/test");
    expect(link.tagName).toBe("A");
  });

  test("Should render Wrapper if don't have href", () => {
    render(<Button>Test Button</Button>);
    expect(screen.queryByTestId("link-component")).not.toBeInTheDocument();
    expect(screen.getByText("Test Button")).toBeInTheDocument();
  });

  test("Should render Tooltip if exists", () => {
    render(<Button tooltip="Hi, I'm a tooltip">Test Button</Button>);
    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toContainElement(screen.getByText("Test Button"));
  });
  test("Should not render Tooltip if no exists", () => {
    render(<Button>Test Button</Button>);
    expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
    expect(screen.getByText("Test Button")).toBeInTheDocument();
  });

  test("Should render as a button with a custom type", () => {
    render(<Button type="submit">Test Button</Button>);
    const button = getInteractiveByText("Test Button");
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "submit");
  });

  test("Should render as an anchor when href prop is provided", () => {
    render(<Button href="/path">Test Button</Button>);
    const link = getInteractiveByText("Test Button");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/path");
  });

  test("Should call onClick callback when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Test Button</Button>);
    const button = getInteractiveByText("Test Button");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("Should render default button correctly", () => {
    render(<Button loading={false}>Default Button</Button>);
    const button = getInteractiveByText("Default Button");
    const buttonClass = button.className;
    const buttonComponentClass = buttonClasses({ variant: "button", color: "primary", size: "base" });
    const buttonClassArray = buttonClass.split(" ");
    const hasMatchingClassNames = buttonComponentClass
      .split(" ")
      .every((className) => buttonClassArray.includes(className));
    expect(hasMatchingClassNames).toBe(true);
    expect(button).toHaveAttribute("type", "button");
  });

  test("Should pass the shallow prop to Link component when href prop is passed", () => {
    const href = "https://example.com";
    render(<Button href={href} shallow />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", href);
    expect(link.tagName).toBe("A");
  });
});
