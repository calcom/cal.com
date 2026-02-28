import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedPopover } from "./AnimatedPopover";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipPrimitive.Provider>{ui}</TooltipPrimitive.Provider>);
};

describe("Popover", () => {
  it("renders trigger element", () => {
    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>Popover Body</PopoverContent>
      </Popover>
    );
    expect(screen.getByText("Open Popover")).toBeInTheDocument();
  });

  it("PopoverContent has correct displayName", () => {
    expect(PopoverContent.displayName).toBeDefined();
  });
});

describe("AnimatedPopover", () => {
  it("renders the text prop", () => {
    renderWithProviders(
      <AnimatedPopover text="Filter">
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("renders custom Trigger when provided", () => {
    renderWithProviders(
      <AnimatedPopover text="Filter" Trigger={<span>Custom Trigger</span>}>
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
  });

  it("renders with prefix text", () => {
    renderWithProviders(
      <AnimatedPopover text="Status" prefix="Filter: ">
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders count when provided and greater than 0", () => {
    renderWithProviders(
      <AnimatedPopover text="Items" count={5}>
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not render count when 0", () => {
    renderWithProviders(
      <AnimatedPopover text="Items" count={0}>
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders PrefixComponent when provided", () => {
    renderWithProviders(
      <AnimatedPopover text="Items" PrefixComponent={<span data-testid="prefix-icon">P</span>}>
        <div>Options</div>
      </AnimatedPopover>
    );
    expect(screen.getByTestId("prefix-icon")).toBeInTheDocument();
  });

  it("applies custom trigger classNames", () => {
    const { container } = renderWithProviders(
      <AnimatedPopover text="Items" popoverTriggerClassNames="custom-trigger-class">
        <div>Options</div>
      </AnimatedPopover>
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("custom-trigger-class");
  });

  it("renders chevron-down icon", () => {
    const { container } = renderWithProviders(
      <AnimatedPopover text="Items">
        <div>Options</div>
      </AnimatedPopover>
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
