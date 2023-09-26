/* eslint-disable playwright/missing-playwright-await */
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

import { AnimatedPopover } from "./AnimatedPopover";

vi.mock("../tooltip", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = (await vi.importActual("../tooltip")) as any;
  const TooltipMock = (props: object) => {
    const [open, setOpen] = useState(false);

    return (
      <TooltipProvider>
        <actual.Tooltip
          {...props}
          open={open}
          onOpenChange={(isOpen: boolean) => {
            setOpen(isOpen);
          }}
        />
      </TooltipProvider>
    );
  };
  return {
    Tooltip: TooltipMock,
  };
});

describe("Tests for Animated Popover Component", () => {
  test("should render the popover component", () => {
    render(
      <AnimatedPopover text="Hello" defaultOpen={true}>
        Some Text
      </AnimatedPopover>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Some Text")).toBeInTheDocument();
  });

  test("should render the component with count", () => {
    render(
      <AnimatedPopover text="Hello" count={1}>
        Some Text
      </AnimatedPopover>
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("should render the component with trigger", () => {
    render(
      <AnimatedPopover text="Hello" Trigger={<button data-testid="trigger-btn">Click here</button>}>
        Some Text
      </AnimatedPopover>
    );
    const triggerBtn = screen.getByTestId("trigger-btn");
    fireEvent.click(triggerBtn);
    expect(screen.getByText("Click here")).toBeInTheDocument();
    expect(screen.getByText("Some Text")).toBeInTheDocument();
  });
});
