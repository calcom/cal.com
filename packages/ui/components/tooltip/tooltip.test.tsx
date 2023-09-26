import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import Tooltip from "./Tooltip";

describe("Tests for Tooltip component", () => {
  test("should render tooltip when defaultOpen prop is true", () => {
    render(
      <TooltipProvider>
        <Tooltip content={<div>This is a tooltip</div>} defaultOpen={true}>
          <button data-testid="btn">Hovered text</button>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText(/Hovered text/i)).toBeInTheDocument();
  });

  test("should render tooltip based on open state", () => {
    function ToolTipExample() {
      const [open, setOpen] = useState(true);
      return (
        <TooltipProvider>
          <Tooltip
            data-testid="tooltip"
            content={<div>This is a tooltip</div>}
            open={open}
            onOpenChange={() => setOpen(false)}>
            <button data-testid="btn">Hovered text</button>
          </Tooltip>
        </TooltipProvider>
      );
    }
    render(<ToolTipExample />);
    const tooltip = screen.getByTestId("tooltip");
    const button = screen.getByTestId("btn");
    expect(tooltip.getAttribute("data-state")).toEqual("instant-open");
    fireEvent.click(button);
    expect(tooltip.getAttribute("data-state")).toEqual("closed");
  });

  test("should render tooltip with given delay", async () => {
    render(
      <TooltipProvider>
        <Tooltip content={<div>This is a tooltip</div>} delayDuration={50}>
          <button data-testid="btn">Hovered text</button>
        </Tooltip>
      </TooltipProvider>
    );
    const button = screen.getByTestId("btn");
    const user = userEvent.setup();
    user.hover(button);
    await waitFor(
      () => {
        expect(screen.getByTestId("btn").getAttribute("data-state")).toEqual("delayed-open");
      },
      {
        timeout: 100,
      }
    );
  });
});
