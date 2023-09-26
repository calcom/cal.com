/* eslint-disable playwright/missing-playwright-await */
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowRight } from "lucide-react";

import { ToggleGroup } from ".";

describe("Tests for ToggleGroup component", () => {
  function ToggleGroupExample() {
    return (
      <TooltipProvider>
        <ToggleGroup
          options={[
            {
              value: "option1",
              label: "Option 1",
              tooltip: "Tooltip for Option 1",
              iconLeft: <ArrowRight />,
            },
            { value: "option2", label: "Option 2", iconLeft: <ArrowRight />, disabled: true },
          ]}
        />
      </TooltipProvider>
    );
  }

  test("render the toggle group", async () => {
    const { debug } = render(<ToggleGroupExample />);
    const opt1 = screen.getByText("Option 1");
    expect(opt1).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(opt1.getElementsByTagName("svg")[0]).toBeInTheDocument();
    expect(screen.getByTestId("toggle-group-item-option2")).toBeDisabled();
    expect(screen.getByTestId("toggle-group-item-option1").getAttribute("data-state")).toEqual("closed");
    const user = userEvent.setup();
    user.hover(opt1);
    await waitFor(() => {
      debug();
      expect(screen.getByTestId("toggle-group-item-option1").getAttribute("data-state")).toEqual(
        "delayed-open"
      );
    });
  });
});
